import urllib.request
import urllib.error
import json
import os

# 1. Request presigned URL from local backend
backend_url = "http://127.0.0.1:8001/api/upload/presigned-url"
post_data = {
    "fileName": "test_10mb.pdf",
    "fileType": "application/pdf",
    "fileSize": 10485760  # 10 MB
}

data_bytes = json.dumps(post_data).encode('utf-8')
req = urllib.request.Request(
    backend_url, 
    data=data_bytes, 
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        res_body = json.loads(response.read().decode('utf-8'))
        presigned_url = res_body["presignedUrl"]
        print("Generated Presigned URL:", presigned_url)
except Exception as e:
    print("Failed to get presigned URL from backend:", e)
    exit(1)

# 2. Simulate browser PUT request to S3 with 10MB of dummy data
dummy_data = b"a" * 10485760

# We send the same headers as the frontend: Content-Type and x-amz-server-side-encryption
s3_req = urllib.request.Request(
    presigned_url,
    data=dummy_data,
    headers={
        'Content-Type': 'application/pdf',
        'x-amz-server-side-encryption': 'AES256'
    },
    method='PUT'
)

try:
    with urllib.request.urlopen(s3_req) as s3_res:
        print("Upload success! Status:", s3_res.status)
except urllib.error.HTTPError as e:
    print("S3 HTTP Error code:", e.code)
    try:
        body = e.read().decode('utf-8')
        print("S3 XML response body:", body)
    except Exception as read_err:
        print("Could not read S3 response body:", read_err)
except Exception as e:
    print("Other S3 upload error:", e)
