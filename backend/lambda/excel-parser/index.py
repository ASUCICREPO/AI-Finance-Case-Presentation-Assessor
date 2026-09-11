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
    
    Returns BOTH values and formulas for each sheet.

    Returns dict of sheet_name -> { headers: [...], rows: [[...], ...], formulas: [[...], ...], rowCount: int }
    """
    try:
        import openpyxl
        # Load twice: once for values, once for formulas
        wb_values = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
        wb_formulas = openpyxl.load_workbook(BytesIO(file_content), data_only=False)
    except ImportError:
        # Fallback: return placeholder indicating openpyxl not available in layer
        return {'error': 'openpyxl not available - add to Lambda layer'}

    result = {}
    for sheet_name in wb_values.sheetnames:
        if sheet_filter and sheet_name not in sheet_filter:
            continue

        ws_values = wb_values[sheet_name]
        ws_formulas = wb_formulas[sheet_name]
        
        # Get all rows including empty ones to preserve structure
        all_rows = []
        all_formulas = []
        max_col = ws_values.max_column
        
        # Extract values
        for row_idx, row in enumerate(ws_values.iter_rows(min_row=1, max_row=ws_values.max_row, values_only=True), start=1):
            row_data = []
            for cell_val in row[:max_col]:
                if cell_val is None:
                    row_data.append('')
                elif isinstance(cell_val, (int, float)):
                    if isinstance(cell_val, float) and cell_val == int(cell_val):
                        row_data.append(int(cell_val))
                    else:
                        row_data.append(cell_val)
                else:
                    row_data.append(str(cell_val))
            all_rows.append(row_data)
        
        # Extract formulas
        for row_idx, row in enumerate(ws_formulas.iter_rows(min_row=1, max_row=ws_formulas.max_row), start=1):
            formula_row = []
            for cell in row[:max_col]:
                # Check if cell has a formula (starts with =)
                if cell.value and isinstance(cell.value, str) and cell.value.startswith('='):
                    formula_row.append(cell.value)
                else:
                    # No formula - show empty or the value itself
                    formula_row.append('')
            all_formulas.append(formula_row)
        
        # Find the header row (first row with multiple non-empty cells)
        header_idx = 0
        for idx, row in enumerate(all_rows):
            non_empty = sum(1 for cell in row if cell not in [None, '', 0])
            if non_empty >= 3:
                header_idx = idx
                break
        
        # Generate column headers
        headers = []
        if header_idx < len(all_rows):
            first_row = all_rows[header_idx]
            for col_idx, cell in enumerate(first_row):
                if cell and str(cell).strip():
                    headers.append(str(cell))
                else:
                    col_letter = openpyxl.utils.get_column_letter(col_idx + 1)
                    headers.append(col_letter)
        else:
            headers = [openpyxl.utils.get_column_letter(i + 1) for i in range(max_col)]
        
        result[sheet_name] = {
            'headers': headers,
            'rows': all_rows,
            'formulas': all_formulas,  # NEW: Include formulas
            'rowCount': len(all_rows),
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
