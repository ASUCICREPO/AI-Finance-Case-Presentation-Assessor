"""
Post-Session Analytics Lambda
Generates assessment reports, scoring, and feedback after Q&A sessions complete.
Uses Amazon Bedrock (Claude/Nova) for rubric-based evaluation of transcripts.

Assessment uses a 6-dimension standardized rubric:
1. Problem Diagnosis and Financial Reasoning (20%)
2. Understanding of Calculations and Model Mechanics (20%)
3. Assumption Validation and Analytical Judgment (20%)
4. Analytical Integration and Ownership (15%)
5. Recommendation Defense and Decision Quality (20%)
6. Executive Communication (5%)

Each dimension is scored on 4 performance levels:
- Level 4 (Strong Command): 90-100
- Level 3 (Competent Command): 75-89
- Level 2 (Partial Command): 50-74
- Level 1 (Insufficient Evidence): 0-49
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

# Assessment model for rubric evaluation
ASSESSMENT_MODEL_ID = os.environ.get('ASSESSMENT_MODEL_ID', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0')

# Standardized 6-dimension rubric with weights and descriptions
DEFAULT_RUBRIC = {
    'problem_diagnosis': {
        'weight': 20,
        'name': 'Problem Diagnosis and Financial Reasoning',
        'description': 'Identifies the underlying problem; distinguishes causes from symptoms; connects evidence to business and financing consequences; explains concepts in practical terms.'
    },
    'calculations_mechanics': {
        'weight': 20,
        'name': 'Understanding of Calculations and Model Mechanics',
        'description': 'Explains material formulas, methods, statement linkages, and outputs; traces numbers to assumptions; interprets calculations rather than reciting them.'
    },
    'assumption_validation': {
        'weight': 20,
        'name': 'Assumption Validation and Analytical Judgment',
        'description': 'Identifies material assumptions; explains why they are reasonable; distinguishes facts from choices; considers alternatives, sensitivity, and uncertainty.'
    },
    'integration_ownership': {
        'weight': 15,
        'name': 'Analytical Integration and Ownership',
        'description': 'Understands the entire submission; reconciles workbook, summary, and presentation; explains work beyond emphasized area; identifies inconsistencies.'
    },
    'recommendation_defense': {
        'weight': 20,
        'name': 'Recommendation Defense and Decision Quality',
        'description': 'Provides feasible, evidence-based recommendations; quantifies impact; considers risks, trade-offs, implementation, and conditions that would change the decision.'
    },
    'executive_communication': {
        'weight': 5,
        'name': 'Executive Communication',
        'description': 'Answers directly, organizes reasoning, explains technical concepts clearly, acknowledges uncertainty, and remains professional.'
    }
}

# Performance level definitions
PERFORMANCE_LEVELS = {
    4: {
        'label': 'Strong Command',
        'description': 'Accurate, integrated, specific, and well supported. Can explain assumptions, respond to challenges, and identify trade-offs.',
        'scoreRange': [90, 100]
    },
    3: {
        'label': 'Competent Command',
        'description': 'Generally correct and adequately supported. Understands major elements but may omit secondary issues.',
        'scoreRange': [75, 89]
    },
    2: {
        'label': 'Partial Command',
        'description': 'Some relevant understanding, but explanations are incomplete, formulaic, weakly supported, or internally inconsistent.',
        'scoreRange': [50, 74]
    },
    1: {
        'label': 'Insufficient Evidence',
        'description': 'Cannot explain material elements, repeatedly contradicts the submission, relies on unsupported claims.',
        'scoreRange': [0, 49]
    }
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
    """Generate assessment analytics using Bedrock for rubric-based scoring."""
    session_id = body.get('sessionId')
    user_id = body.get('userId')
    transcript = body.get('transcript', '')
    rubric_weights = body.get('rubricWeights', DEFAULT_RUBRIC)
    persona_name = body.get('personaName', 'Stakeholder')
    persona_role = body.get('personaRole', 'Executive')

    if not session_id or not user_id:
        return response(400, {'error': 'Missing sessionId or userId'})

    # If transcript is provided, generate assessment using Bedrock
    if transcript and transcript.strip():
        try:
            assessment = generate_rubric_assessment(
                transcript=transcript,
                rubric=rubric_weights,
                persona_name=persona_name,
                persona_role=persona_role
            )
            assessment['sessionID'] = session_id
            assessment['userID'] = user_id
            assessment['generatedAt'] = datetime.utcnow().isoformat()
            assessment['status'] = 'completed'
        except Exception as e:
            print(f"Bedrock assessment error: {str(e)}")
            # Return placeholder if Bedrock fails
            assessment = create_placeholder_assessment(session_id, user_id, rubric_weights)
    else:
        # No transcript - return placeholder structure
        assessment = create_placeholder_assessment(session_id, user_id, rubric_weights)

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


def create_placeholder_assessment(session_id, user_id, rubric_weights):
    """Create placeholder assessment structure when transcript is not available."""
    return {
        'assessmentID': f"assess_{session_id}",
        'sessionID': session_id,
        'userID': user_id,
        'generatedAt': datetime.utcnow().isoformat(),
        'overallScore': None,
        'categoryScores': {
            category: {
                'performanceLevel': None,
                'score': None,
                'justification': 'Awaiting Q&A session completion',
                'confidence': 'low'
            } for category in rubric_weights.keys()
        },
        'rubricWeights': {k: v.get('weight', v) if isinstance(v, dict) else v for k, v in rubric_weights.items()},
        'performanceLevels': PERFORMANCE_LEVELS,
        'feedback': {
            'strengths': [],
            'improvements': [],
            'evidence': [],
        },
        'status': 'pending',
        'provisionalLabel': 'AI-generated provisional assessment. The instructor retains final authority.'
    }


def generate_rubric_assessment(transcript, rubric, persona_name, persona_role):
    """Generate rubric-based assessment using Bedrock Claude."""
    
    # Build rubric description for prompt
    rubric_description = ""
    for key, config in rubric.items():
        if isinstance(config, dict):
            rubric_description += f"\n{key} (Weight: {config.get('weight', 0)}%):\n"
            rubric_description += f"  Name: {config.get('name', key)}\n"
            rubric_description += f"  Description: {config.get('description', '')}\n"
        else:
            rubric_description += f"\n{key} (Weight: {config}%)\n"

    prompt = f"""You are an expert educational assessor evaluating a student's oral defense of their group's financial case analysis.

## ASSESSMENT INSTRUCTIONS

Evaluate the student using this 6-dimension standardized rubric. For EACH dimension:

1. Assign a PERFORMANCE LEVEL (1-4):
   - Level 4 (Strong Command): 90-100 points - Accurate, integrated, specific, well-supported
   - Level 3 (Competent Command): 75-89 points - Generally correct, adequate support
   - Level 2 (Partial Command): 50-74 points - Some understanding, incomplete/inconsistent
   - Level 1 (Insufficient Evidence): 0-49 points - Cannot explain, contradicts submission

2. Assign a SCORE within the level's range
3. Provide JUSTIFICATION with specific transcript evidence
4. Assess CONFIDENCE (high/moderate/low)

## RUBRIC DIMENSIONS
{rubric_description}

## Q&A TRANSCRIPT
{transcript}

## IMPORTANT
- Evaluate against the student's own submission, NOT a "correct" answer
- Alternative assumptions are acceptable when reasonable and well-defended
- Cite specific evidence from the transcript

Provide your assessment now."""

    tool_config = {
        "tools": [{
            "toolSpec": {
                "name": "provide_assessment",
                "description": "Provide structured rubric-based assessment",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "overallScore": {"type": "number"},
                            "overallSummary": {"type": "string"},
                            "categoryScores": {
                                "type": "object",
                                "properties": {
                                    "problem_diagnosis": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    },
                                    "calculations_mechanics": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    },
                                    "assumption_validation": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    },
                                    "integration_ownership": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    },
                                    "recommendation_defense": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    },
                                    "executive_communication": {
                                        "type": "object",
                                        "properties": {
                                            "performanceLevel": {"type": "integer"},
                                            "score": {"type": "number"},
                                            "justification": {"type": "string"},
                                            "evidence": {"type": "array", "items": {"type": "string"}},
                                            "confidence": {"type": "string"}
                                        }
                                    }
                                }
                            },
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "improvements": {"type": "array", "items": {"type": "string"}},
                            "evidenceCitations": {"type": "array", "items": {"type": "string"}},
                            "inconsistencies": {"type": "array", "items": {"type": "string"}},
                            "unansweredQuestions": {"type": "array", "items": {"type": "string"}},
                            "instructorReviewFlags": {"type": "array", "items": {"type": "string"}},
                            "overallConfidence": {"type": "string"}
                        },
                        "required": ["overallScore", "overallSummary", "categoryScores", "strengths", "improvements", "overallConfidence"]
                    }
                }
            }
        }],
        "toolChoice": {"tool": {"name": "provide_assessment"}}
    }

    bedrock_response = bedrock.converse(
        modelId=ASSESSMENT_MODEL_ID,
        messages=[{'role': 'user', 'content': [{'text': prompt}]}],
        toolConfig=tool_config,
    )
    
    assessment = bedrock_response['output']['message']['content'][0]['toolUse']['input']
    
    # Add metadata
    assessment['rubricVersion'] = '2.0'
    assessment['rubricName'] = 'Standardized Cross-Case Assessment Rubric'
    assessment['performanceLevels'] = PERFORMANCE_LEVELS
    assessment['rubricWeights'] = {k: v.get('weight', v) if isinstance(v, dict) else v for k, v in rubric.items()}
    assessment['provisionalLabel'] = 'AI-generated provisional assessment. The instructor retains final authority over the student\'s grade.'
    
    return assessment


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
