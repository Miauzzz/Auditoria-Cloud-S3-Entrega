import os
import re
import uuid
from urllib.parse import quote
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import boto3
import fitz
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET = os.getenv("AWS_S3_BUCKET") or os.getenv("S3_BUCKET_NAME") or "archivacloud-p01"
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE", "database_dynamo")

MAX_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

s3 = boto3.client("s3", region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
dynamo_table = dynamodb.Table(DYNAMODB_TABLE)

app = FastAPI(title="ArchivaCloud P-01 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


class PresignedRequest(BaseModel):
    fileName: str
    fileType: str
    fileSize: int


class DynamoItem(BaseModel):
    id_tabla: Optional[str] = None
    nombre_proyecto: str
    descripcion: str


def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    return obj


def clean_filename(filename: str) -> str:
    filename = filename.strip().replace("\\", "_").replace("/", "_")
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)
    return filename[:120]


def validate_file(file_name: str, file_type: str, file_size: int):
    safe_name = clean_filename(file_name)
    ext = os.path.splitext(safe_name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo PDF y DOCX.")

    if file_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Content-Type no permitido.")

    if file_size > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 10 MB.")

    return safe_name


@app.get("/")
def root():
    return {"message": "ArchivaCloud P-01 backend funcionando"}

@app.get("/healthz")
def healthz():
    try:
        # Verificar conectividad con S3 (intento rápido con MaxKeys=0)
        s3.list_objects_v2(Bucket=BUCKET, MaxKeys=0)
        # Verificar conectividad con DynamoDB (obteniendo el estado de la tabla)
        status = dynamo_table.table_status
        if status not in ["ACTIVE", "UPDATING"]:
            raise Exception("La tabla de DynamoDB no está activa")
        return {"status": "ok", "aws": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Conexión con AWS fuera de línea: {str(e)}"
        )


@app.post("/api/upload/presigned-url")
def create_presigned_url(data: PresignedRequest):
    safe_name = validate_file(data.fileName, data.fileType, data.fileSize)
    file_id = str(uuid.uuid4())
    key = f"uploads/{file_id}-{safe_name}"

    try:
        presigned_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": data.fileType,
                "ServerSideEncryption": "AES256",
            },
            ExpiresIn=3600,
        )

        public_url = f"https://{BUCKET}.s3.{AWS_REGION}.amazonaws.com/{quote(key)}"

        created_at = datetime.now(timezone.utc).isoformat()
        dynamo_item = {
            "id_tabla": file_id,
            "nombre_proyecto": safe_name,
            "descripcion": "Archivo registrado desde ArchivaCloud P-01",
            "s3_key": key,
            "bucket": BUCKET,
            "region": AWS_REGION,
            "file_type": data.fileType,
            "file_size": data.fileSize,
            "status": "PRESIGNED_URL_GENERADA",
            "created_at": created_at,
        }
        
        dynamo_table.put_item(Item=dynamo_item)

        return {
            "presignedUrl": presigned_url,
            "key": key,
            "publicUrl": public_url,
            "dynamoId": file_id,
        }

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        print(f"Error de AWS en presigned-url: {error_code}")
        raise HTTPException(
            status_code=500,
            detail="Error de AWS DynamoDB: revisa credenciales, tabla o región."
        )


@app.get("/api/files")
def list_files():
    try:
        response = s3.list_objects_v2(Bucket=BUCKET, Prefix="uploads/")
        files = []

        for obj in response.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/"):
                continue

            # Generar URL pre-firmada de descarga (GET) válida por 1 hora
            download_url = s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": BUCKET,
                    "Key": key,
                    "ResponseContentDisposition": f"attachment; filename=\"{key.split('/')[-1]}\""
                },
                ExpiresIn=3600,
            )

            files.append({
                "key": key,
                "name": key.split("/")[-1],
                "size": obj["Size"],
                "lastModified": obj["LastModified"].isoformat(),
                "url": download_url,
            })

        return {"files": files}

    except ClientError:
        raise HTTPException(status_code=500, detail="Error al listar archivos.")


@app.get("/api/files/preview/{key:path}")
def get_pdf_preview(key: str):
    if ".." in key or "\\" in key:
        raise HTTPException(status_code=400, detail="Path traversal detectado")

    if not key.startswith("uploads/") or not key.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Llave de archivo invalida o formato no soportado")

    try:
        response = s3.get_object(Bucket=BUCKET, Key=key)
        pdf_bytes = response["Body"].read()

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as fitz_err:
            raise HTTPException(
                status_code=422,
                detail=f"Archivo PDF invalido o corrupto: {str(fitz_err)}"
            )

        if doc.page_count == 0:
            doc.close()
            raise HTTPException(
                status_code=422,
                detail="El archivo PDF no tiene paginas"
            )

        page = doc.load_page(0)
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        png_bytes = pix.tobytes("png")
        doc.close()

        return Response(content=png_bytes, media_type="image/png")

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "")
        status_code = 404 if error_code == "NoSuchKey" else 500
        error_msg = "El archivo no existe en S3" if error_code == "NoSuchKey" else "Error al obtener el archivo de S3"
        raise HTTPException(status_code=status_code, detail=error_msg)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar previsualizacion: {str(e)}"
        )


@app.delete("/api/files/{key:path}")
def delete_file(key: str):
    try:
        if not key.startswith("uploads/"):
            raise HTTPException(status_code=400, detail="Key inválida.")

        # 1. Eliminar objeto de S3
        s3.delete_object(Bucket=BUCKET, Key=key)

        # 2. Eliminar registro correspondiente en DynamoDB
        try:
            scan_params = {}
            done = False
            while not done:
                response = dynamo_table.scan(**scan_params)
                for item in response.get("Items", []):
                    if item.get("s3_key") == key:
                        dynamo_table.delete_item(Key={"id_tabla": item["id_tabla"]})
                if "LastEvaluatedKey" in response:
                    scan_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]
                else:
                    done = True
        except Exception as db_err:
            print(f"Error al eliminar de DynamoDB para {key}: {str(db_err)}")

        return {"message": "Archivo eliminado correctamente."}

    except ClientError:
        raise HTTPException(status_code=500, detail="Error al eliminar archivo.")


@app.post("/api/dynamodb/items")
def create_dynamo_item(item: DynamoItem):
    try:
        id_tabla = item.id_tabla or str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        
        db_item = {
            "id_tabla": id_tabla,
            "nombre_proyecto": item.nombre_proyecto,
            "descripcion": item.descripcion,
            "created_at": created_at
        }
        
        dynamo_table.put_item(Item=db_item)
        
        return {
            "message": "Item creado con éxito",
            "id_tabla": id_tabla
        }
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        print(f"Error de AWS DynamoDB en /api/dynamodb/items: {error_code}")
        raise HTTPException(
            status_code=500,
            detail="Error de AWS DynamoDB: revisa credenciales, tabla o región."
        )


@app.post("/api/dynamodb/demo")
def insert_demo_items():
    try:
        item1 = {
            "id_tabla": "1",
            "nombre_proyecto": "ArchivaCloud P-01",
            "descripcion": "Registro demo creado desde FastAPI usando DynamoDB."
        }
        item2 = {
            "id_tabla": "2",
            "nombre_proyecto": "Sprint 4",
            "descripcion": "Integración de DynamoDB con backend principal."
        }
        dynamo_table.put_item(Item=item1)
        dynamo_table.put_item(Item=item2)
        return {"message": "Registros demo insertados con éxito."}
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        print(f"Error de AWS DynamoDB en /api/dynamodb/demo: {error_code}")
        raise HTTPException(
            status_code=500,
            detail="Error de AWS DynamoDB: revisa credenciales, tabla o región."
        )


@app.get("/api/dynamodb/items")
def list_dynamo_items():
    try:
        response = dynamo_table.scan()
        items = response.get("Items", [])
        
        while "LastEvaluatedKey" in response:
            response = dynamo_table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))
            
        converted_items = convert_decimals(items)
        return {
            "table_name": DYNAMODB_TABLE,
            "items": converted_items
        }
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        print(f"Error de AWS DynamoDB en /api/dynamodb/items (GET): {error_code}")
        raise HTTPException(
            status_code=500,
            detail="Error de AWS DynamoDB: revisa credenciales, tabla o región."
        )


@app.get("/api/debug/aws-config")
def get_aws_config():
    aws_region = os.getenv("AWS_REGION", "us-east-1")
    dynamodb_table = os.getenv("DYNAMODB_TABLE", "database_dynamo")
    bucket = os.getenv("AWS_S3_BUCKET") or os.getenv("S3_BUCKET_NAME")
    
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_session_token = os.getenv("AWS_SESSION_TOKEN")
    
    return {
        "aws_region": aws_region,
        "dynamodb_table": dynamodb_table,
        "bucket_configured": bool(bucket),
        "dynamodb_table_configured": bool(dynamodb_table),
        "aws_access_key_configured": bool(aws_access_key and aws_access_key.strip() != "" and aws_access_key != "change_me"),
        "aws_secret_key_configured": bool(aws_secret_key and aws_secret_key.strip() != "" and aws_secret_key != "change_me"),
        "aws_session_token_configured": bool(aws_session_token and aws_session_token.strip() != "" and aws_session_token != "change_me")
    }


@app.get("/api/debug/dynamodb-table")
def get_dynamodb_table_status():
    try:
        status = dynamo_table.table_status
        return {
            "table": DYNAMODB_TABLE,
            "status": status
        }
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        print(f"Error de AWS DynamoDB al verificar tabla: {error_code}")
        raise HTTPException(
            status_code=500,
            detail="Error de AWS DynamoDB: revisa credenciales, tabla o región."
        )
    except Exception as e:
        print(f"Error inesperado al verificar tabla: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al conectar con DynamoDB: revisa la configuración."
        )


@app.get("/api/config")
def get_config(request: Request):
    server_info = request.scope.get("server")
    port = server_info[1] if server_info else 8003
    return {
        "aws_region": AWS_REGION,
        "port": port,
        "encryption_standard": "AES-256"
    }