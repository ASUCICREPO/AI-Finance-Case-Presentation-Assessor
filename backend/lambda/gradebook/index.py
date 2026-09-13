"""
Gradebook Lambda
Handles grade export, analytics, and bulk operations for TA Dashboard.
"""
import json
import os
import csv
import io
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
groups_table = dynamodb.Table(os.environ.get('GROUPS_TABLE', 'GroupsTable'))
assessments_table = dynamodb.Table(os.environ.get('ASSESSMENTS_TABLE', 'AssessmentsTable'))
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


def get_gradebook(query_params):
    """Get comprehensive gradebook data."""
    try:
        assessment_id = query_params.get('assessmentId') if query_params else None
        section = query_params.get('section') if query_params else None
        
        # Get all students
        if section:
            students_result = students_table.query(
                IndexName='section-index',
                KeyConditionExpression=Key('section').eq(section)
            )
        else:
            students_result = students_table.scan()
        
        students = students_result.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in students_result:
            if section:
                students_result = students_table.query(
                    IndexName='section-index',
                    KeyConditionExpression=Key('section').eq(section),
                    ExclusiveStartKey=students_result['LastEvaluatedKey']
                )
            else:
                students_result = students_table.scan(
                    ExclusiveStartKey=students_result['LastEvaluatedKey']
                )
            students.extend(students_result.get('Items', []))
        
        # Get all submissions
        if assessment_id:
            submissions_result = submissions_table.query(
                IndexName='assessmentId-index',
                KeyConditionExpression=Key('assessmentId').eq(assessment_id)
            )
        else:
            submissions_result = submissions_table.scan()
        
        submissions = submissions_result.get('Items', [])
        
        while 'LastEvaluatedKey' in submissions_result:
            if assessment_id:
                submissions_result = submissions_table.query(
                    IndexName='assessmentId-index',
                    KeyConditionExpression=Key('assessmentId').eq(assessment_id),
                    ExclusiveStartKey=submissions_result['LastEvaluatedKey']
                )
            else:
                submissions_result = submissions_table.scan(
                    ExclusiveStartKey=submissions_result['LastEvaluatedKey']
                )
            submissions.extend(submissions_result.get('Items', []))
        
        # Build gradebook entries
        submissions_by_student = {}
        for sub in submissions:
            student_id = sub['studentId']
            if student_id not in submissions_by_student:
                submissions_by_student[student_id] = []
            submissions_by_student[student_id].append(sub)
        
        gradebook = []
        for student in students:
            student_id = student['studentId']
            student_submissions = submissions_by_student.get(student_id, [])
            
            # Calculate final grade (use reviewer score if available, else AI score)
            total_score = 0
            graded_count = 0
            
            for sub in student_submissions:
                score = sub.get('reviewerScore') or sub.get('aiScore')
                if score is not None:
                    total_score += float(score)
                    graded_count += 1
            
            avg_score = total_score / graded_count if graded_count > 0 else None
            
            gradebook.append({
                'studentId': student_id,
                'firstName': student['firstName'],
                'lastName': student['lastName'],
                'email': student['email'],
                'section': student.get('section'),
                'groupId': student.get('groupId'),
                'submissionCount': len(student_submissions),
                'gradedCount': graded_count,
                'averageScore': round(avg_score, 2) if avg_score else None,
                'submissions': student_submissions
            })
        
        # Sort by last name
        gradebook.sort(key=lambda x: x['lastName'])
        
        return response(200, {
            'gradebook': gradebook,
            'totalStudents': len(students),
            'totalSubmissions': len(submissions)
        })
    except Exception as e:
        print(f"Error getting gradebook: {str(e)}")
        return response(500, {'error': str(e)})


def get_stats(query_params):
    """Get analytics and statistics."""
    try:
        assessment_id = query_params.get('assessmentId') if query_params else None
        
        # Get submissions
        if assessment_id:
            result = submissions_table.query(
                IndexName='assessmentId-index',
                KeyConditionExpression=Key('assessmentId').eq(assessment_id)
            )
        else:
            result = submissions_table.scan()
        
        submissions = result.get('Items', [])
        
        while 'LastEvaluatedKey' in result:
            if assessment_id:
                result = submissions_table.query(
                    IndexName='assessmentId-index',
                    KeyConditionExpression=Key('assessmentId').eq(assessment_id),
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            else:
                result = submissions_table.scan(
                    ExclusiveStartKey=result['LastEvaluatedKey']
                )
            submissions.extend(result.get('Items', []))
        
        # Calculate statistics
        total = len(submissions)
        pending = sum(1 for s in submissions if s.get('status') == 'Pending')
        reviewed = sum(1 for s in submissions if s.get('status') == 'Reviewed')
        overridden = sum(1 for s in submissions if s.get('status') == 'Overridden')
        
        # Score statistics
        ai_scores = [float(s['aiScore']) for s in submissions if s.get('aiScore') is not None]
        reviewer_scores = [float(s['reviewerScore']) for s in submissions if s.get('reviewerScore') is not None]
        
        def calc_stats(scores):
            if not scores:
                return {'min': None, 'max': None, 'avg': None, 'median': None}
            sorted_scores = sorted(scores)
            return {
                'min': round(min(scores), 2),
                'max': round(max(scores), 2),
                'avg': round(sum(scores) / len(scores), 2),
                'median': round(sorted_scores[len(sorted_scores) // 2], 2)
            }
        
        # Score distribution (buckets of 10)
        def get_distribution(scores):
            buckets = {f'{i}-{i+9}': 0 for i in range(0, 100, 10)}
            buckets['100'] = 0
            for score in scores:
                if score == 100:
                    buckets['100'] += 1
                else:
                    bucket = f'{int(score // 10) * 10}-{int(score // 10) * 10 + 9}'
                    if bucket in buckets:
                        buckets[bucket] += 1
            return buckets
        
        final_scores = []
        for s in submissions:
            score = s.get('reviewerScore') or s.get('aiScore')
            if score is not None:
                final_scores.append(float(score))
        
        stats = {
            'total': total,
            'byStatus': {
                'pending': pending,
                'reviewed': reviewed,
                'overridden': overridden
            },
            'aiScores': calc_stats(ai_scores),
            'reviewerScores': calc_stats(reviewer_scores),
            'finalScores': calc_stats(final_scores),
            'scoreDistribution': get_distribution(final_scores),
            'reviewProgress': {
                'reviewed': reviewed + overridden,
                'pending': pending,
                'percentComplete': round((reviewed + overridden) / total * 100, 1) if total > 0 else 0
            }
        }
        
        return response(200, stats)
    except Exception as e:
        print(f"Error getting stats: {str(e)}")
        return response(500, {'error': str(e)})


def export_gradebook(body):
    """Export gradebook to CSV and upload to S3."""
    try:
        assessment_id = body.get('assessmentId')
        section = body.get('section')
        include_breakdown = body.get('includeBreakdown', False)
        
        # Get gradebook data
        query_params = {}
        if assessment_id:
            query_params['assessmentId'] = assessment_id
        if section:
            query_params['section'] = section
        
        # Reuse get_gradebook logic
        gradebook_response = get_gradebook(query_params)
        gradebook_data = json.loads(gradebook_response['body'])
        gradebook = gradebook_data.get('gradebook', [])
        
        # Create CSV
        output = io.StringIO()
        
        headers = [
            'Student ID', 'First Name', 'Last Name', 'Email', 'Section',
            'Submissions', 'Graded', 'Average Score'
        ]
        
        if include_breakdown:
            headers.extend(['AI Score', 'Reviewer Score', 'Status', 'Feedback'])
        
        writer = csv.DictWriter(output, fieldnames=headers)
        writer.writeheader()
        
        for entry in gradebook:
            row = {
                'Student ID': entry['studentId'],
                'First Name': entry['firstName'],
                'Last Name': entry['lastName'],
                'Email': entry['email'],
                'Section': entry.get('section', ''),
                'Submissions': entry['submissionCount'],
                'Graded': entry['gradedCount'],
                'Average Score': entry['averageScore'] or 'N/A'
            }
            
            if include_breakdown and entry.get('submissions'):
                # For detailed export, create one row per submission
                for sub in entry['submissions']:
                    detailed_row = row.copy()
                    detailed_row['AI Score'] = sub.get('aiScore', 'N/A')
                    detailed_row['Reviewer Score'] = sub.get('reviewerScore', 'N/A')
                    detailed_row['Status'] = sub.get('status', 'N/A')
                    detailed_row['Feedback'] = sub.get('reviewerFeedback', '')
                    writer.writerow(detailed_row)
            else:
                writer.writerow(row)
        
        csv_content = output.getvalue()
        
        # Upload to S3
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"gradebook_export_{timestamp}.csv"
        s3_key = f"exports/gradebook/{filename}"
        
        s3.put_object(
            Bucket=uploads_bucket,
            Key=s3_key,
            Body=csv_content.encode('utf-8'),
            ContentType='text/csv',
            ContentDisposition=f'attachment; filename="{filename}"'
        )
        
        # Generate pre-signed URL for download
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': uploads_bucket, 'Key': s3_key},
            ExpiresIn=3600  # 1 hour
        )
        
        return response(200, {
            'message': 'Gradebook exported successfully',
            'filename': filename,
            'downloadUrl': presigned_url,
            'recordCount': len(gradebook)
        })
    except Exception as e:
        print(f"Error exporting gradebook: {str(e)}")
        return response(500, {'error': str(e)})


def handler(event, context):
    """Main Lambda handler."""
    print(f"Event: {json.dumps(event)}")
    
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    query_params = event.get('queryStringParameters') or {}
    
    # Parse body
    body = {}
    if event.get('body'):
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return response(400, {'error': 'Invalid JSON body'})
    
    # Route requests
    if '/export' in path:
        if http_method == 'POST':
            return export_gradebook(body)
        return response(405, {'error': 'Method not allowed'})
    
    if '/stats' in path:
        if http_method == 'GET':
            return get_stats(query_params)
        return response(405, {'error': 'Method not allowed'})
    
    # Default: get gradebook
    if http_method == 'GET':
        return get_gradebook(query_params)
    
    return response(405, {'error': 'Method not allowed'})
