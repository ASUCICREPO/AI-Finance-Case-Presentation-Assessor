"""
S3 Pre-signed URL Lambda
Generates pre-signed URLs for secure file uploads (Excel workbooks)
and downloads (assessment reports, recordings).
"""
import json
import os
import boto3

s3 = boto3.client('s3')
BUCKET = os.environ['UPLOADS_BUCKET']

# Allowed file types for upload
ALLOWED_UPLOAD_TYPES = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'application/vnd.ms-excel',  # .xls
    'text/csv',  # .csv
    'video/webm',  # recordings
    'video/mp4',  # recordings
    'application/pdf',  # presentations
}

# Max file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024


def handler(event, context):
    """
    Generate pre-signed URL for upload or download.

    Input:
    {
        "action": "upload" | "download",
        "sessionId": "...",
        "fileName": "workbook.xlsx",
        "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "folder": "uploads" | "recordings" | "reports"  // optional, defaults to "uploads"
    }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        action = body.get('action', 'upload')
        session_id = body.get('sessionId')
        file_name = body.get('fileName')
        content_type = body.get('contentType', 'application/octet-stream')
        folder = body.get('folder', 'uploads')

        if not session_id or not file_name:
            return response(400, {'error': 'Missing sessionId or fileName'})

        s3_key = f"{folder}/{session_id}/{file_name}"

        if action == 'upload':
            if content_type not in ALLOWED_UPLOAD_TYPES:
                return response(400, {'error': f'File type not allowed: {content_type}'})

            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': BUCKET,
                    'Key': s3_key,
                    'ContentType': content_type,
                },
                ExpiresIn=3600,  # 1 hour
            )
        elif action == 'download':
            presigned_url = s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': BUCKET,
                    'Key': s3_key,
                },
                ExpiresIn=3600,
            )
        else:
            return response(400, {'error': 'Invalid action. Use "upload" or "download"'})

        return response(200, {
            'url': presigned_url,
            's3Key': s3_key,
            'expiresIn': 3600,
        })

    except Exception as e:
        print(f"Pre-signed URL error: {str(e)}")
        return response(500, {'error': str(e)})


def response(status_code, body):
    """Format API Gateway response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        'body': json.dumps(body, default=str),
    }
