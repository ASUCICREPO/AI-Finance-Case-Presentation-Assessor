"""
Students CRUD Lambda
Handles all student roster management operations for the TA Dashboard.
"""
import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
students_table = dynamodb.Table(os.environ.get('STUDENTS_TABLE', 'StudentsTable'))
groups_table = dynamodb.Table(os.environ.get('GROUPS_TABLE', 'GroupsTable'))

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def response(status_code, body):
    """Standard API response."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, default=decimal_default)
    }


def get_all_students(query_params):
    """Get all students with optional filtering."""
    try:
        # Check for section filter
        section = query_params.get('section') if query_params else None
        
        if section:
            # Query by section using GSI
            result = students_table.query(
                IndexName='section-index',
                KeyConditionExpression=Key('section').eq(section)
            )
        else:
            # Scan all students
            result = students_table.scan()
        
        students = result.get('Items', [])
        
        # Handle pagination for large datasets
        while 'LastEvaluatedKey' in result:
            if section:
                result = students_table.query(
                    IndexName='section-index',
                    KeyConditionExpression=Key('section').eq(section),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            else:
                result = students_table.scan(
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            students.extend(result.get('Items', []))
        
        return response(200, {'students': students, 'count': len(students)})
    except Exception as e:
        print(f"Error getting students: {str(e)}")
        return response(500, {'error': str(e)})


def get_student_by_id(student_id):
    """Get a single student by ID."""
    try:
        result = students_table.get_item(Key={'studentId': student_id})
        student = result.get('Item')
        
        if not student:
            return response(404, {'error': 'Student not found'})
        
        return response(200, student)
    except Exception as e:
        print(f"Error getting student: {str(e)}")
        return response(500, {'error': str(e)})


def create_student(body):
    """Create a new student."""
    try:
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'email']
        for field in required_fields:
            if field not in body:
                return response(400, {'error': f'Missing required field: {field}'})
        
        # Check if email already exists
        existing = students_table.query(
            IndexName='email-index',
            KeyConditionExpression=Key('email').eq(body['email'])
        )
        if existing.get('Items'):
            return response(409, {'error': 'Student with this email already exists'})
        
        student_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        student = {
            'studentId': student_id,
            'firstName': body['firstName'],
            'lastName': body['lastName'],
            'email': body['email'],
            'loginId': body.get('loginId', body['email'].split('@')[0]),
            'section': body.get('section', 'Default'),
            'groupId': body.get('groupId'),
            'role': 'student',
            'status': body.get('status', 'Active'),
            'lastActivity': None,
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        students_table.put_item(Item=student)
        
        return response(201, student)
    except Exception as e:
        print(f"Error creating student: {str(e)}")
        return response(500, {'error': str(e)})


def update_student(student_id, body):
    """Update an existing student."""
    try:
        # Check if student exists
        existing = students_table.get_item(Key={'studentId': student_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Student not found'})
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Build update expression
        update_expr = 'SET updatedAt = :updated'
        expr_values = {':updated': timestamp}
        expr_names = {}
        
        allowed_fields = ['firstName', 'lastName', 'email', 'loginId', 'section', 
                          'groupId', 'status', 'lastActivity']
        
        for field in allowed_fields:
            if field in body:
                # Handle reserved words
                if field == 'status':
                    update_expr += f', #status = :status'
                    expr_names['#status'] = 'status'
                    expr_values[':status'] = body[field]
                else:
                    update_expr += f', {field} = :{field}'
                    expr_values[f':{field}'] = body[field]
        
        update_params = {
            'Key': {'studentId': student_id},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names
        
        result = students_table.update_item(**update_params)
        
        return response(200, result['Attributes'])
    except Exception as e:
        print(f"Error updating student: {str(e)}")
        return response(500, {'error': str(e)})


def delete_student(student_id):
    """Delete a student."""
    try:
        # Check if student exists
        existing = students_table.get_item(Key={'studentId': student_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Student not found'})
        
        students_table.delete_item(Key={'studentId': student_id})
        
        return response(200, {'message': 'Student deleted successfully'})
    except Exception as e:
        print(f"Error deleting student: {str(e)}")
        return response(500, {'error': str(e)})


def bulk_import_students(body):
    """Bulk import students from a list."""
    try:
        students_list = body.get('students', [])
        if not students_list:
            return response(400, {'error': 'No students provided'})
        
        created = []
        errors = []
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        with students_table.batch_writer() as batch:
            for idx, student_data in enumerate(students_list):
                try:
                    # Validate required fields
                    if not all(k in student_data for k in ['firstName', 'lastName', 'email']):
                        errors.append({
                            'index': idx,
                            'error': 'Missing required fields',
                            'data': student_data
                        })
                        continue
                    
                    # Check for existing email
                    existing = students_table.query(
                        IndexName='email-index',
                        KeyConditionExpression=Key('email').eq(student_data['email'])
                    )
                    if existing.get('Items'):
                        errors.append({
                            'index': idx,
                            'error': 'Email already exists',
                            'email': student_data['email']
                        })
                        continue
                    
                    student = {
                        'studentId': str(uuid.uuid4()),
                        'firstName': student_data['firstName'],
                        'lastName': student_data['lastName'],
                        'email': student_data['email'],
                        'loginId': student_data.get('loginId', student_data['email'].split('@')[0]),
                        'section': student_data.get('section', 'Default'),
                        'groupId': student_data.get('groupId'),
                        'role': 'student',
                        'status': 'Active',
                        'lastActivity': None,
                        'createdAt': timestamp,
                        'updatedAt': timestamp
                    }
                    
                    batch.put_item(Item=student)
                    created.append(student)
                    
                except Exception as e:
                    errors.append({
                        'index': idx,
                        'error': str(e),
                        'data': student_data
                    })
        
        return response(200, {
            'created': len(created),
            'errors': len(errors),
            'students': created,
            'errorDetails': errors
        })
    except Exception as e:
        print(f"Error in bulk import: {str(e)}")
        return response(500, {'error': str(e)})


def handler(event, context):
    """Main Lambda handler."""
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    path_params = event.get('pathParameters') or {}
    query_params = event.get('queryStringParameters') or {}
    
    # Parse body
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return response(400, {'error': 'Invalid JSON body'})
    
    # Route requests
    student_id = path_params.get('studentId')
    
    # Check for bulk operations
    if '/bulk' in path:
        if http_method == 'POST':
            return bulk_import_students(body)
        return response(405, {'error': 'Method not allowed'})
    
    # Single student operations
    if student_id:
        if http_method == 'GET':
            return get_student_by_id(student_id)
        elif http_method == 'PUT':
            return update_student(student_id, body)
        elif http_method == 'DELETE':
            return delete_student(student_id)
    else:
        if http_method == 'GET':
            return get_all_students(query_params)
        elif http_method == 'POST':
            return create_student(body)
    
    return response(405, {'error': 'Method not allowed'})
