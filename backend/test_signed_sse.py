import boto3
import urllib.request
import urllib.error
import os
from dotenv import load_dotenv

load_dotenv()
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET = os.getenv("AWS_S3_BUCKET", "archivacloud-p01")

s3 = boto3.client("s3", region_name=AWS_REGION)

try:
    print("Generating presigned URL WITH ServerSideEncryption signed...")
    presigned_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET,
            "Key": "uploads/test_signed_sse.pdf",
            "ContentType": "application/pdf",
            "ServerSideEncryption": "AES256"
        },
        ExpiresIn=3600
    )
    print("Presigned URL:", presigned_url)

    print("Uploading to S3 with Encryption Header...")
    req = urllib.request.Request(
        presigned_url,
        data=b"dummy contents for signed sse",
        headers={
            'Content-Type': 'application/pdf',
            'x-amz-server-side-encryption': 'AES256'
        },
        method='PUT'
    )
    with urllib.request.urlopen(req) as res:
        print("Upload SUCCESS! Status:", res.status)

except Exception as e:
    print("Upload FAILED:", e)
    if hasattr(e, 'read'):
        print("Response:", e.read().decode('utf-8'))
