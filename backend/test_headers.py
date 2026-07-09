import urllib.request
import urllib.error
import json
import os

backend_url = "http://127.0.0.1:8001/api/upload/presigned-url"

def get_presigned(filename, file_size=1000):
    post_data = {
        "fileName": filename,
        "fileType": "application/pdf",
        "fileSize": file_size
    }
    data_bytes = json.dumps(post_data).encode('utf-8')
    req = urllib.request.Request(
        backend_url, 
        data=data_bytes, 
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as response:
        res_body = json.loads(response.read().decode('utf-8'))
        return res_body["presignedUrl"]

# Test 1: Uploading WITHOUT x-amz-server-side-encryption header
print("--- Test 1: Without Encryption Header ---")
url_no_enc = get_presigned("test_no_enc.pdf")
req_no_enc = urllib.request.Request(
    url_no_enc,
    data=b"dummy content",
    headers={'Content-Type': 'application/pdf'},
    method='PUT'
)
try:
    with urllib.request.urlopen(req_no_enc) as res:
        print("Test 1 SUCCESS! Status:", res.status)
except Exception as e:
    print("Test 1 FAILED:", e)
    if hasattr(e, 'read'):
        print("Response:", e.read().decode('utf-8'))

# Test 2: Uploading WITH x-amz-server-side-encryption header
print("\n--- Test 2: With Encryption Header ---")
url_enc = get_presigned("test_enc.pdf")
req_enc = urllib.request.Request(
    url_enc,
    data=b"dummy content",
    headers={
        'Content-Type': 'application/pdf',
        'x-amz-server-side-encryption': 'AES256'
    },
    method='PUT'
)
try:
    with urllib.request.urlopen(req_enc) as res:
        print("Test 2 SUCCESS! Status:", res.status)
except Exception as e:
    print("Test 2 FAILED:", e)
    if hasattr(e, 'read'):
        print("Response:", e.read().decode('utf-8'))
