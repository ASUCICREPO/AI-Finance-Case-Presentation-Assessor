"""
Post-Session Analytics Lambda
Generates assessment reports, scoring, and feedback after Q&A sessions complete.
Uses Amazon Bedrock (Claude/Nova) for rubric-based evaluation of transcripts.

Assessment categories:
- Financial Reasoning
- Understanding of Calculations
- Assumption Validation
- Recommendation Defense
- Analytical Depth
- Decision-Making Quality
- Communication Effectiveness
"""
import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime')

sessions_table = dynamodb.Table(os.environ['SESSIONS_TABLE'])
assessments_table = dynamodb.Table(os.environ['ASSESSMENTS_TABLE'])
BUCKET = os.environ['UPLOADS_BUCKET']

# Default rubric weights
DEFAULT_RUBRIC = {
    'financial_reasoning': 20,
    'understanding_calculations': 20,
    'assumption_validation': 15,
    'recommendation_defense': 15,
    'analytical_depth': 15,
    'decision_making_quality': 10,
    'communication_effectiveness': 5,
}


def handler(event, context):
    """
    Generate post-session analytics and assessment report.

    GET: Retrieve existing analytics for a session
    POST: Trigger analytics generation for a completed session

    POST input:
    {
        "sessionId": "...",
        "userId": "...",
        "transcript": "...",
        "rubricWeights": { ... }  // optional override
    }
    """
    http_method = event.get('httpMethod', '')

    try:
        if http_method == 'GET':
            params = event.get('queryStringParameters') or {}
            session_id = params.get('sessionId')
            if not session_id:
                return response(400, {'error': 'Missing sessionId query param'})
            return get_analytics(session_id)

        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return generate_analytics(body)

        else:
            return response(400, {'error': 'Invalid method'})

    except Exception as e:
        print(f"Analytics error: {str(e)}")
        return response(500, {'error': str(e)})


def get_analytics(session_id):
    """Retrieve existing analytics for a session."""
    # Check S3 for generated report
    report_key = f"sessions/{session_id}/assessment_report.json"
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=report_key)
        report = json.loads(obj['Body'].read())
        return response(200, report)
    except s3.exceptions.NoSuchKey:
        return response(404, {'error': 'Analytics not yet available'})
    except Exception:
        return response(404, {'error': 'Analytics not found'})


def generate_analytics(body):
    """Generate assessment analytics using Bedrock for rubric scoring."""
    session_id = body.get('sessionId')
    user_id = body.get('userId')
    transcript = body.get('transcript', '')
    rubric_weights = body.get('rubricWeights', DEFAULT_RUBRIC)

    if not session_id or not user_id:
        return response(400, {'error': 'Missing sessionId or userId'})

    # TODO: Call Bedrock with transcript + rubric for scoring
    # For now, return placeholder assessment structure
    assessment = {
        'assessmentID': f"assess_{session_id}",
        'sessionID': session_id,
        'userID': user_id,
        'generatedAt': datetime.utcnow().isoformat(),
        'overallScore': None,  # Will be populated by Bedrock
        'categoryScores': {category: None for category in rubric_weights.keys()},
        'rubricWeights': rubric_weights,
        'feedback': {
            'strengths': [],
            'improvements': [],
            'evidence': [],
        },
        'status': 'pending',
    }

    # Store in DynamoDB
    assessments_table.put_item(Item=assessment)

    # Store report in S3
    report_key = f"sessions/{session_id}/assessment_report.json"
    s3.put_object(
        Bucket=BUCKET,
        Key=report_key,
        Body=json.dumps(assessment, default=str),
        ContentType='application/json',
    )

    return response(200, assessment)


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
