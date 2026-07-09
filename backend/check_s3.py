import boto3
import os
from dotenv import load_dotenv

load_dotenv()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET = os.getenv("AWS_S3_BUCKET", "archivacloud-p01")

s3 = boto3.client("s3", region_name=AWS_REGION)

try:
    response = s3.list_objects_v2(Bucket=BUCKET, Prefix="uploads/")
    print("Objects in bucket:")
    for obj in response.get("Contents", []):
        print(f"Key: {obj['Key']}, Size: {obj['Size']} bytes")
        if "test_5mb.pdf" in obj['Key']:
            # Download first 100 bytes
            res = s3.get_object(Bucket=BUCKET, Key=obj['Key'], Range="bytes=0-99")
            content = res["Body"].read()
            print("First 100 bytes:", content)
            print("Starts with %PDF?:", content.startswith(b"%PDF"))
except Exception as e:
    print("Error:", e)
