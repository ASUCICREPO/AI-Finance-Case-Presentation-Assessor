"""
Validation Agent Lambda
Validates student submissions before starting Q&A sessions.
Checks that required files are uploaded and workbook structure is valid.
"""
import json
import os
import boto3

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table(os.environ['SESSIONS_TABLE'])
BUCKET = os.environ['UPLOADS_BUCKET']


def handler(event, context):
    """
    Validate student submission for a Q&A session.

    Expected input:
    {
        "sessionId": "...",
        "userId": "...",
        "caseId": "...",
        "uploadedFiles": ["workbook.xlsx"]
    }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        session_id = body.get('sessionId')
        user_id = body.get('userId')
        case_id = body.get('caseId')
        uploaded_files = body.get('uploadedFiles', [])

        if not session_id or not user_id:
            return response(400, {'error': 'Missing sessionId or userId'})

        validation_results = {
            'sessionId': session_id,
            'userId': user_id,
            'isValid': True,
            'errors': [],
            'warnings': [],
        }

        # Check that at least one Excel file was uploaded
        excel_files = [f for f in uploaded_files if f.endswith(('.xlsx', '.xls', '.csv'))]
        if not excel_files:
            validation_results['isValid'] = False
            validation_results['errors'].append('No Excel/CSV file found in uploads')

        # Verify file exists in S3
        for file_name in excel_files:
            s3_key = f"uploads/{session_id}/{file_name}"
            try:
                s3.head_object(Bucket=BUCKET, Key=s3_key)
            except s3.exceptions.ClientError:
                validation_results['isValid'] = False
                validation_results['errors'].append(f'File not found in storage: {file_name}')

        # Update session record
        sessions_table.put_item(Item={
            'sessionID': session_id,
            'userID': user_id,
            'caseID': case_id or 'default',
            'status': 'validated' if validation_results['isValid'] else 'validation_failed',
            'uploadedFiles': uploaded_files,
            'validationResults': validation_results,
        })

        return response(200, validation_results)

    except Exception as e:
        print(f"Validation error: {str(e)}")
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
