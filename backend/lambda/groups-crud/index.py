"""
Groups CRUD Lambda
Handles group management for assessments - professors can organize students into groups.
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
groups_table = dynamodb.Table(os.environ.get('GROUPS_TABLE', 'GroupsTable'))
students_table = dynamodb.Table(os.environ.get('STUDENTS_TABLE', 'StudentsTable'))
assessments_table = dynamodb.Table(os.environ.get('ASSESSMENTS_TABLE', 'AssessmentsTable'))

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


def get_all_groups(query_params):
    """Get all groups with optional filtering by assessment."""
    try:
        assessment_id = query_params.get('assessmentId') if query_params else None
        
        if assessment_id:
            # Query by assessment using GSI
            result = groups_table.query(
                IndexName='assessmentId-index',
                KeyConditionExpression=Key('assessmentId').eq(assessment_id)
            )
        else:
            # Scan all groups
            result = groups_table.scan()
        
        groups = result.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in result:
            if assessment_id:
                result = groups_table.query(
                    IndexName='assessmentId-index',
                    KeyConditionExpression=Key('assessmentId').eq(assessment_id),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            else:
                result = groups_table.scan(
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            groups.extend(result.get('Items', []))
        
        # Optionally include student details
        include_students = query_params.get('includeStudents', 'false').lower() == 'true' if query_params else False
        
        if include_students:
            for group in groups:
                student_ids = group.get('studentIds', [])
                students = []
                for sid in student_ids:
                    student = students_table.get_item(Key={'studentId': sid}).get('Item')
                    if student:
                        students.append({
                            'studentId': student['studentId'],
                            'firstName': student['firstName'],
                            'lastName': student['lastName'],
                            'email': student['email']
                        })
                group['students'] = students
        
        return response(200, {'groups': groups, 'count': len(groups)})
    except Exception as e:
        print(f"Error getting groups: {str(e)}")
        return response(500, {'error': str(e)})


def get_group_by_id(group_id, query_params):
    """Get a single group by ID with optional student details."""
    try:
        result = groups_table.get_item(Key={'groupId': group_id})
        group = result.get('Item')
        
        if not group:
            return response(404, {'error': 'Group not found'})
        
        # Include student details
        include_students = query_params.get('includeStudents', 'true').lower() == 'true' if query_params else True
        
        if include_students:
            student_ids = group.get('studentIds', [])
            students = []
            for sid in student_ids:
                student = students_table.get_item(Key={'studentId': sid}).get('Item')
                if student:
                    students.append({
                        'studentId': student['studentId'],
                        'firstName': student['firstName'],
                        'lastName': student['lastName'],
                        'email': student['email'],
                        'loginId': student.get('loginId'),
                        'section': student.get('section')
                    })
            group['students'] = students
        
        return response(200, group)
    except Exception as e:
        print(f"Error getting group: {str(e)}")
        return response(500, {'error': str(e)})


def create_group(body):
    """Create a new group."""
    try:
        # Validate required fields
        required_fields = ['groupName', 'assessmentId', 'sessionNumber', 'groupNumber']
        for field in required_fields:
            if field not in body:
                return response(400, {'error': f'Missing required field: {field}'})
        
        group_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        group = {
            'groupId': group_id,
            'groupName': body['groupName'],
            'assessmentId': body['assessmentId'],
            'sessionNumber': str(body['sessionNumber']),  # e.g., "1", "2" for Session 1, Session 2
            'groupNumber': str(body['groupNumber']),      # e.g., "1", "2", "3" for Group 1, 2, 3
            'description': body.get('description', ''),
            'studentIds': body.get('studentIds', []),
            'maxSize': body.get('maxSize', 10),
            'status': body.get('status', 'Active'),
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        groups_table.put_item(Item=group)
        
        # Update students with their group assignment
        if group['studentIds']:
            for student_id in group['studentIds']:
                try:
                    students_table.update_item(
                        Key={'studentId': student_id},
                        UpdateExpression='SET groupId = :gid, sessionNumber = :sn, groupNumber = :gn, updatedAt = :ts',
                        ExpressionAttributeValues={
                            ':gid': group_id,
                            ':sn': group['sessionNumber'],
                            ':gn': group['groupNumber'],
                            ':ts': timestamp
                        }
                    )
                except Exception as e:
                    print(f"Warning: Could not update student {student_id}: {str(e)}")
        
        return response(201, group)
    except Exception as e:
        print(f"Error creating group: {str(e)}")
        return response(500, {'error': str(e)})


def update_group(group_id, body):
    """Update an existing group."""
    try:
        # Check if group exists
        existing = groups_table.get_item(Key={'groupId': group_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Group not found'})
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Build update expression
        update_expr = 'SET updatedAt = :updated'
        expr_values = {':updated': timestamp}
        expr_names = {}
        
        allowed_fields = ['groupName', 'description', 'maxSize', 'status']
        
        for field in allowed_fields:
            if field in body:
                if field == 'status':
                    update_expr += f', #status = :status'
                    expr_names['#status'] = 'status'
                    expr_values[':status'] = body[field]
                else:
                    update_expr += f', {field} = :{field}'
                    expr_values[f':{field}'] = body[field]
        
        update_params = {
            'Key': {'groupId': group_id},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names
        
        result = groups_table.update_item(**update_params)
        
        return response(200, result['Attributes'])
    except Exception as e:
        print(f"Error updating group: {str(e)}")
        return response(500, {'error': str(e)})


def delete_group(group_id):
    """Delete a group."""
    try:
        # Check if group exists
        existing = groups_table.get_item(Key={'groupId': group_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Group not found'})
        
        # Remove group assignment from students
        student_ids = existing['Item'].get('studentIds', [])
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        for student_id in student_ids:
            try:
                students_table.update_item(
                    Key={'studentId': student_id},
                    UpdateExpression='REMOVE groupId SET updatedAt = :ts',
                    ExpressionAttributeValues={':ts': timestamp}
                )
            except Exception as e:
                print(f"Warning: Could not update student {student_id}: {str(e)}")
        
        groups_table.delete_item(Key={'groupId': group_id})
        
        return response(200, {'message': 'Group deleted successfully'})
    except Exception as e:
        print(f"Error deleting group: {str(e)}")
        return response(500, {'error': str(e)})


def add_members(group_id, body):
    """Add students to a group."""
    try:
        # Get current group
        result = groups_table.get_item(Key={'groupId': group_id})
        group = result.get('Item')
        
        if not group:
            return response(404, {'error': 'Group not found'})
        
        student_ids = body.get('studentIds', [])
        if not student_ids:
            return response(400, {'error': 'No student IDs provided'})
        
        current_members = set(group.get('studentIds', []))
        timestamp = datetime.utcnow().isoformat() + 'Z'
        added = []
        
        for student_id in student_ids:
            # Verify student exists
            student = students_table.get_item(Key={'studentId': student_id}).get('Item')
            if not student:
                continue
            
            if student_id not in current_members:
                current_members.add(student_id)
                added.append(student_id)
                
                # Update student's group assignment
                students_table.update_item(
                    Key={'studentId': student_id},
                    UpdateExpression='SET groupId = :gid, updatedAt = :ts',
                    ExpressionAttributeValues={
                        ':gid': group_id,
                        ':ts': timestamp
                    }
                )
        
        # Update group's student list
        groups_table.update_item(
            Key={'groupId': group_id},
            UpdateExpression='SET studentIds = :sids, updatedAt = :ts',
            ExpressionAttributeValues={
                ':sids': list(current_members),
                ':ts': timestamp
            }
        )
        
        return response(200, {
            'message': f'Added {len(added)} students to group',
            'addedStudentIds': added,
            'totalMembers': len(current_members)
        })
    except Exception as e:
        print(f"Error adding members: {str(e)}")
        return response(500, {'error': str(e)})


def remove_members(group_id, body):
    """Remove students from a group."""
    try:
        # Get current group
        result = groups_table.get_item(Key={'groupId': group_id})
        group = result.get('Item')
        
        if not group:
            return response(404, {'error': 'Group not found'})
        
        student_ids = body.get('studentIds', [])
        if not student_ids:
            return response(400, {'error': 'No student IDs provided'})
        
        current_members = set(group.get('studentIds', []))
        timestamp = datetime.utcnow().isoformat() + 'Z'
        removed = []
        
        for student_id in student_ids:
            if student_id in current_members:
                current_members.discard(student_id)
                removed.append(student_id)
                
                # Remove group assignment from student
                students_table.update_item(
                    Key={'studentId': student_id},
                    UpdateExpression='REMOVE groupId SET updatedAt = :ts',
                    ExpressionAttributeValues={':ts': timestamp}
                )
        
        # Update group's student list
        groups_table.update_item(
            Key={'groupId': group_id},
            UpdateExpression='SET studentIds = :sids, updatedAt = :ts',
            ExpressionAttributeValues={
                ':sids': list(current_members),
                ':ts': timestamp
            }
        )
        
        return response(200, {
            'message': f'Removed {len(removed)} students from group',
            'removedStudentIds': removed,
            'totalMembers': len(current_members)
        })
    except Exception as e:
        print(f"Error removing members: {str(e)}")
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
    group_id = path_params.get('groupId')
    
    # Check for members operations
    if '/members' in path and group_id:
        if http_method == 'POST':
            return add_members(group_id, body)
        elif http_method == 'DELETE':
            return remove_members(group_id, body)
        return response(405, {'error': 'Method not allowed'})
    
    # Single group operations
    if group_id:
        if http_method == 'GET':
            return get_group_by_id(group_id, query_params)
        elif http_method == 'PUT':
            return update_group(group_id, body)
        elif http_method == 'DELETE':
            return delete_group(group_id)
    else:
        if http_method == 'GET':
            return get_all_groups(query_params)
        elif http_method == 'POST':
            return create_group(body)
    
    return response(405, {'error': 'Method not allowed'})
