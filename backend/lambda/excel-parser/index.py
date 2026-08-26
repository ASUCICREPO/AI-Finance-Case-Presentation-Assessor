"""
Excel Parser Lambda
Parses uploaded Excel/Google Sheet workbooks and extracts structured data
for the AI questioning engine. Handles multi-sheet workbooks with financial
models, assumptions, and property data.
"""
import json
import os
import boto3
from io import BytesIO

s3 = boto3.client('s3')
BUCKET = os.environ['UPLOADS_BUCKET']


def handler(event, context):
    """
    Parse an Excel workbook from S3 and return structured sheet data.

    Expected input:
    {
        "s3Key": "uploads/<sessionId>/workbook.xlsx",
        "sessionId": "...",
        "sheets": ["Summary", "Properties", "Financial Model", "Assumptions"]  // optional filter
    }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        s3_key = body.get('s3Key')
        session_id = body.get('sessionId')
        sheet_filter = body.get('sheets')

        if not s3_key:
            return response(400, {'error': 'Missing s3Key'})

        # Download file from S3
        obj = s3.get_object(Bucket=BUCKET, Key=s3_key)
        file_content = obj['Body'].read()

        # Parse Excel workbook
        parsed_data = parse_workbook(file_content, sheet_filter)

        # Store parsed result back to S3 for the AI agent to reference
        if session_id:
            parsed_key = f"sessions/{session_id}/parsed_workbook.json"
            s3.put_object(
                Bucket=BUCKET,
                Key=parsed_key,
                Body=json.dumps(parsed_data, default=str),
                ContentType='application/json',
            )

        return response(200, {
            'sessionId': session_id,
            'sheets': list(parsed_data.keys()),
            'data': parsed_data,
        })

    except Exception as e:
        print(f"Error parsing workbook: {str(e)}")
        return response(500, {'error': str(e)})


def parse_workbook(file_content: bytes, sheet_filter: list = None) -> dict:
    """
    Parse Excel workbook bytes into structured JSON.
    Uses openpyxl for .xlsx files.

    Returns dict of sheet_name -> { headers: [...], rows: [[...], ...] }
    """
    try:
        import openpyxl
        wb = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
    except ImportError:
        # Fallback: return placeholder indicating openpyxl not available in layer
        return {'error': 'openpyxl not available - add to Lambda layer'}

    result = {}
    for sheet_name in wb.sheetnames:
        if sheet_filter and sheet_name not in sheet_filter:
            continue

        ws = wb[sheet_name]
        rows = []
        headers = []

        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i == 0:
                headers = [str(cell) if cell else f'Col_{j}' for j, cell in enumerate(row)]
            else:
                rows.append([cell for cell in row])

        result[sheet_name] = {
            'headers': headers,
            'rows': rows,
            'rowCount': len(rows),
        }

    return result


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
