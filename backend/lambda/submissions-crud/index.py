"""
Submissions CRUD Lambda
Handles student submissions and TA grading operations.
"""
import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

submissions_table = dynamodb.Table(os.environ.get('SUBMISSIONS_TABLE', 'SubmissionsTable'))
students_table = dynamodb.Table(os.environ.get('STUDENTS_TABLE', 'StudentsTable'))
assessments_table = dynamodb.Table(os.environ.get('ASSESSMENTS_TABLE', 'AssessmentsTable'))
sessions_table = dynamodb.Table(os.environ.get('SESSIONS_TABLE', 'SessionsTable'))
uploads_bucket = os.environ.get('UPLOADS_BUCKET', 'uploads')

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


def get_all_submissions(query_params):
    """Get all submissions with optional filtering."""
    try:
        assessment_id = query_params.get('assessmentId') if query_params else None
        student_id = query_params.get('studentId') if query_params else None
        status = query_params.get('status') if query_params else None
        group_id = query_params.get('groupId') if query_params else None
        session_number = query_params.get('sessionNumber') if query_params else None
        
        if assessment_id:
            result = submissions_table.query(
                IndexName='assessmentId-index',
                KeyConditionExpression=Key('assessmentId').eq(assessment_id)
            )
        elif student_id:
            result = submissions_table.query(
                IndexName='studentId-index',
                KeyConditionExpression=Key('studentId').eq(student_id)
            )
        elif status:
            result = submissions_table.query(
                IndexName='status-index',
                KeyConditionExpression=Key('status').eq(status)
            )
        else:
            result = submissions_table.scan()
        
        submissions = result.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in result:
            if assessment_id:
                result = submissions_table.query(
                    IndexName='assessmentId-index',
                    KeyConditionExpression=Key('assessmentId').eq(assessment_id),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            elif student_id:
                result = submissions_table.query(
                    IndexName='studentId-index',
                    KeyConditionExpression=Key('studentId').eq(student_id),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            elif status:
                result = submissions_table.query(
                    IndexName='status-index',
                    KeyConditionExpression=Key('status').eq(status),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            else:
                result = submissions_table.scan(
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            submissions.extend(result.get('Items', []))
        
        # Filter by groupId or sessionNumber if provided (post-query filtering)
        if group_id:
            submissions = [s for s in submissions if s.get('groupId') == group_id]
        if session_number:
            submissions = [s for s in submissions if s.get('sessionNumber') == session_number]
        
        # Enrich with student details if requested
        include_student = query_params.get('includeStudent', 'true').lower() == 'true' if query_params else True
        # Check if request is from TA (include AI scores) or student (exclude AI scores)
        include_ai_analytics = query_params.get('includeAiAnalytics', 'true').lower() == 'true' if query_params else True
        
        if include_student:
            for sub in submissions:
                student = students_table.get_item(Key={'studentId': sub['studentId']}).get('Item')
                if student:
                    sub['student'] = {
                        'studentId': student['studentId'],
                        'firstName': student['firstName'],
                        'lastName': student['lastName'],
                        'email': student['email'],
                        'section': student.get('section'),
                        'sessionNumber': student.get('sessionNumber'),
                        'groupNumber': student.get('groupNumber')
                    }
        
        # If not including AI analytics (student view), strip sensitive data
        if not include_ai_analytics:
            for sub in submissions:
                sub.pop('aiScore', None)
                sub.pop('aiScoreBreakdown', None)
                sub.pop('aiAnalytics', None)
                sub.pop('reviewerScore', None)
                sub.pop('reviewerScoreBreakdown', None)
                sub.pop('reviewerFeedback', None)
        
        return response(200, {'submissions': submissions, 'count': len(submissions)})
    except Exception as e:
        print(f"Error getting submissions: {str(e)}")
        return response(500, {'error': str(e)})


def get_submission_by_id(submission_id, query_params):
    """Get a single submission by ID."""
    try:
        result = submissions_table.get_item(Key={'submissionId': submission_id})
        submission = result.get('Item')
        
        if not submission:
            return response(404, {'error': 'Submission not found'})
        
        # Include student details
        student = students_table.get_item(Key={'studentId': submission['studentId']}).get('Item')
        if student:
            submission['student'] = {
                'studentId': student['studentId'],
                'firstName': student['firstName'],
                'lastName': student['lastName'],
                'email': student['email'],
                'section': student.get('section'),
                'groupId': student.get('groupId')
            }
        
        # Include assessment details
        assessment = assessments_table.get_item(Key={'assessmentID': submission['assessmentId']}).get('Item')
        if assessment:
            submission['assessment'] = {
                'assessmentId': assessment['assessmentID'],
                'title': assessment.get('title', 'Assessment'),
                'dueDate': assessment.get('dueDate')
            }
        
        return response(200, submission)
    except Exception as e:
        print(f"Error getting submission: {str(e)}")
        return response(500, {'error': str(e)})


def create_submission(body):
    """Create a new submission (typically from student completing a session)."""
    try:
        required_fields = ['studentId', 'assessmentId', 'sessionId']
        for field in required_fields:
            if field not in body:
                return response(400, {'error': f'Missing required field: {field}'})
        
        submission_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        # Get student info for session/group numbers
        student = students_table.get_item(Key={'studentId': body['studentId']}).get('Item', {})
        
        submission = {
            'submissionId': submission_id,
            'studentId': body['studentId'],
            'assessmentId': body['assessmentId'],
            'sessionId': body['sessionId'],
            'groupId': body.get('groupId') or student.get('groupId'),
            'sessionNumber': body.get('sessionNumber') or student.get('sessionNumber'),
            'groupNumber': body.get('groupNumber') or student.get('groupNumber'),
            'status': 'Pending',  # Pending, Reviewed, Overridden
            'submittedAt': timestamp,
            
            # AI Analytics Results (from AgentCore/Nova Sonic)
            'aiScore': body.get('aiScore'),
            'aiScoreBreakdown': body.get('aiScoreBreakdown', {}),
            'aiAnalytics': body.get('aiAnalytics', {}),  # Full AI assessment report
            'transcript': body.get('transcript', []),     # Full Q&A transcript
            'questionsAsked': body.get('questionsAsked', 0),
            'responsesGiven': body.get('responsesGiven', 0),
            'sessionDuration': body.get('sessionDuration', 0),  # in seconds
            
            # Reviewer (TA/Prof) Scores - populated later
            'reviewerScore': None,
            'reviewerScoreBreakdown': None,
            'reviewerFeedback': None,
            'reviewedAt': None,
            'reviewedBy': None,
            
            # File references
            'videoUrl': body.get('videoUrl'),
            'transcriptUrl': body.get('transcriptUrl'),
            'spreadsheetUrl': body.get('spreadsheetUrl'),
            'spreadsheetS3Key': body.get('spreadsheetS3Key'),
            
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        submissions_table.put_item(Item=submission)
        
        return response(201, submission)
    except Exception as e:
        print(f"Error creating submission: {str(e)}")
        return response(500, {'error': str(e)})


def update_submission(submission_id, body):
    """Update an existing submission."""
    try:
        existing = submissions_table.get_item(Key={'submissionId': submission_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Submission not found'})
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        update_expr = 'SET updatedAt = :updated'
        expr_values = {':updated': timestamp}
        expr_names = {}
        
        allowed_fields = ['videoUrl', 'transcriptUrl', 'spreadsheetUrl', 'aiScore', 
                          'aiScoreBreakdown', 'duration']
        
        for field in allowed_fields:
            if field in body:
                update_expr += f', {field} = :{field}'
                expr_values[f':{field}'] = body[field]
        
        update_params = {
            'Key': {'submissionId': submission_id},
            'UpdateExpression': update_expr,
            'ExpressionAttributeValues': expr_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        if expr_names:
            update_params['ExpressionAttributeNames'] = expr_names
        
        result = submissions_table.update_item(**update_params)
        
        return response(200, result['Attributes'])
    except Exception as e:
        print(f"Error updating submission: {str(e)}")
        return response(500, {'error': str(e)})


def grade_submission(submission_id, body):
    """TA grades a submission with score and feedback."""
    try:
        existing = submissions_table.get_item(Key={'submissionId': submission_id})
        if not existing.get('Item'):
            return response(404, {'error': 'Submission not found'})
        
        timestamp = datetime.utcnow().isoformat() + 'Z'
        current_submission = existing['Item']
        
        # Determine new status
        # If reviewer score differs from AI score, mark as Overridden
        ai_score = current_submission.get('aiScore')
        reviewer_score = body.get('reviewerScore')
        
        if reviewer_score is not None and ai_score is not None:
            # Allow 5% tolerance before marking as overridden
            if abs(float(reviewer_score) - float(ai_score)) > 5:
                new_status = 'Overridden'
            else:
                new_status = 'Reviewed'
        else:
            new_status = 'Reviewed'
        
        update_expr = '''SET 
            #status = :status,
            reviewerScore = :reviewerScore,
            reviewerScoreBreakdown = :breakdown,
            reviewerFeedback = :feedback,
            reviewedAt = :reviewedAt,
            reviewedBy = :reviewedBy,
            updatedAt = :updated'''
        
        expr_values = {
            ':status': new_status,
            ':reviewerScore': body.get('reviewerScore'),
            ':breakdown': body.get('reviewerScoreBreakdown', {}),
            ':feedback': body.get('reviewerFeedback', ''),
            ':reviewedAt': timestamp,
            ':reviewedBy': body.get('reviewerId', 'TA'),
            ':updated': timestamp
        }
        
        result = submissions_table.update_item(
            Key={'submissionId': submission_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        return response(200, result['Attributes'])
    except Exception as e:
        print(f"Error grading submission: {str(e)}")
        return response(500, {'error': str(e)})


def get_transcript(submission_id):
    """Get transcript for a submission."""
    try:
        result = submissions_table.get_item(Key={'submissionId': submission_id})
        submission = result.get('Item')
        
        if not submission:
            return response(404, {'error': 'Submission not found'})
        
        transcript_url = submission.get('transcriptUrl')
        session_id = submission.get('sessionId')
        
        # Try to get transcript from S3
        transcript_content = None
        
        if transcript_url:
            try:
                # Extract bucket and key from URL or use stored key
                if transcript_url.startswith('s3://'):
                    parts = transcript_url.replace('s3://', '').split('/', 1)
                    bucket = parts[0]
                    key = parts[1]
                else:
                    bucket = uploads_bucket
                    key = transcript_url
                
                obj = s3.get_object(Bucket=bucket, Key=key)
                transcript_content = obj['Body'].read().decode('utf-8')
            except Exception as e:
                print(f"Could not fetch transcript from S3: {str(e)}")
        
        # Try to get from session if no transcript file
        if not transcript_content and session_id:
            session = sessions_table.get_item(Key={'sessionID': session_id}).get('Item')
            if session and session.get('transcript'):
                transcript_content = session.get('transcript')
        
        return response(200, {
            'submissionId': submission_id,
            'transcript': transcript_content,
            'transcriptUrl': transcript_url
        })
    except Exception as e:
        print(f"Error getting transcript: {str(e)}")
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
    
    submission_id = path_params.get('submissionId')
    
    # Grade endpoint
    if '/grade' in path and submission_id:
        if http_method == 'POST':
            return grade_submission(submission_id, body)
        return response(405, {'error': 'Method not allowed'})
    
    # Transcript endpoint
    if '/transcript' in path and submission_id:
        if http_method == 'GET':
            return get_transcript(submission_id)
        return response(405, {'error': 'Method not allowed'})
    
    # Standard CRUD
    if submission_id:
        if http_method == 'GET':
            return get_submission_by_id(submission_id, query_params)
        elif http_method == 'PUT':
            return update_submission(submission_id, body)
    else:
        if http_method == 'GET':
            return get_all_submissions(query_params)
        elif http_method == 'POST':
            return create_submission(body)
    
    return response(405, {'error': 'Method not allowed'})
