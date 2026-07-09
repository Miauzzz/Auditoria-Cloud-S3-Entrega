import boto3
import os
import json
from dotenv import load_dotenv

load_dotenv()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET = os.getenv("AWS_S3_BUCKET", "archivacloud-p01")

s3 = boto3.client("s3", region_name=AWS_REGION)

cors_configuration = {
    'CORSRules': [
        {
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['PUT', 'GET', 'DELETE'],
            'AllowedOrigins': ['http://localhost:5173'],
            'ExposeHeaders': ['x-amz-server-side-encryption']
        }
    ]
}

try:
    print(f"Checking CORS for bucket: {BUCKET}")
    try:
        current_cors = s3.get_bucket_cors(Bucket=BUCKET)
        print("Current CORS rules:", json.dumps(current_cors.get('CORSRules', []), indent=2))
    except Exception as get_err:
        print("Could not get current CORS (it might be empty):", get_err)
        current_cors = None

    print("Applying CORS configuration...")
    s3.put_bucket_cors(Bucket=BUCKET, CORSConfiguration=cors_configuration)
    print("CORS configuration applied successfully!")

    # Verify again
    updated_cors = s3.get_bucket_cors(Bucket=BUCKET)
    print("Verified CORS rules:", json.dumps(updated_cors.get('CORSRules', []), indent=2))

except Exception as e:
    print("Error:", e)
