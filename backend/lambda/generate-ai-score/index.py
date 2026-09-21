"""
Generate AI Score Lambda
Generates AI rubric-based assessment scores for submissions that don't have them.
Called manually by TA to score submissions, or automatically after session completes.

Uses Amazon Bedrock Claude for 6-dimension standardized rubric evaluation.
"""

import json
import os
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
bedrock = boto3.client("bedrock-runtime")

submissions_table = dynamodb.Table(os.environ["SUBMISSIONS_TABLE"])

# Assessment model - Claude Sonnet
ASSESSMENT_MODEL_ID = os.environ.get(
    "ASSESSMENT_MODEL_ID", "us.anthropic.claude-sonnet-4-5-20250929-v1:0"
)

# Standardized 6-dimension rubric
DEFAULT_RUBRIC = {
    "problem_diagnosis": {
        "weight": 20,
        "name": "Problem Diagnosis and Financial Reasoning",
        "description": "Identifies the underlying problem; distinguishes causes from symptoms; connects evidence to business and financing consequences.",
    },
    "calculations_mechanics": {
        "weight": 20,
        "name": "Understanding of Calculations and Model Mechanics",
        "description": "Explains formulas, methods, statement linkages; traces numbers to assumptions; interprets calculations.",
    },
    "assumption_validation": {
        "weight": 20,
        "name": "Assumption Validation and Analytical Judgment",
        "description": "Identifies material assumptions; explains why reasonable; distinguishes facts from choices; considers alternatives.",
    },
    "integration_ownership": {
        "weight": 15,
        "name": "Analytical Integration and Ownership",
        "description": "Understands entire submission; reconciles workbook, summary, presentation; explains beyond emphasized area.",
    },
    "recommendation_defense": {
        "weight": 20,
        "name": "Recommendation Defense and Decision Quality",
        "description": "Provides feasible, evidence-based recommendations; quantifies impact; considers risks and trade-offs.",
    },
    "executive_communication": {
        "weight": 5,
        "name": "Executive Communication",
        "description": "Answers directly, organizes reasoning, explains technical concepts clearly, remains professional.",
    },
}

PERFORMANCE_LEVELS = {
    4: {"label": "Strong Command", "scoreRange": [90, 100]},
    3: {"label": "Competent Command", "scoreRange": [75, 89]},
    2: {"label": "Partial Command", "scoreRange": [50, 74]},
    1: {"label": "Insufficient Evidence", "scoreRange": [0, 49]},
}


def handler(event, context):
    """
    Generate AI scores for a submission.

    POST /generate-ai-score
    Body: { "submissionId": "...", "force": false }

    GET /generate-ai-score?submissionId=...&force=false
    """
    http_method = event.get("httpMethod", "")

    try:
        if http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            submission_id = body.get("submissionId")
            force = body.get("force", False)
        elif http_method == "GET":
            params = event.get("queryStringParameters") or {}
            submission_id = params.get("submissionId")
            force = params.get("force", "false").lower() == "true"
        else:
            return response(400, {"error": "Invalid method"})

        if not submission_id:
            return response(400, {"error": "Missing submissionId"})

        return generate_score(submission_id, force)

    except Exception as e:
        print(f"Error: {str(e)}")
        return response(500, {"error": str(e)})


def generate_score(submission_id: str, force: bool = False):
    """Generate AI score for a submission."""
    # Get submission
    result = submissions_table.get_item(Key={"submissionId": submission_id})
    submission = result.get("Item")

    if not submission:
        return response(404, {"error": "Submission not found"})

    # Check if already has AI score (unless force=true)
    if not force and submission.get("aiScore") is not None:
        return response(
            200,
            {
                "message": "Submission already has AI score",
                "submissionId": submission_id,
                "aiScore": float(submission["aiScore"]),
                "skipped": True,
            },
        )

    # Get transcript data
    qa_transcript = submission.get("qaTranscript") or submission.get("transcript") or []
    presentation_transcript = submission.get("presentationTranscript", "")

    if not qa_transcript and not presentation_transcript:
        return response(
            400,
            {
                "error": "No transcript data available to score",
                "submissionId": submission_id,
            },
        )

    # Build transcript text for AI evaluation
    transcript_text = ""

    if presentation_transcript:
        transcript_text += f"## Student Presentation\n{presentation_transcript}\n\n"

    if qa_transcript:
        transcript_text += "## Q&A Session\n"
        for entry in qa_transcript:
            role = entry.get("role", "unknown")
            text = entry.get("text", "")
            speaker = "[AI Stakeholder]" if role == "assistant" else "[Student]"
            transcript_text += f"{speaker}: {text}\n"

    # Generate assessment using Bedrock
    assessment = generate_rubric_assessment(transcript_text, DEFAULT_RUBRIC)

    if not assessment:
        return response(500, {"error": "Failed to generate AI assessment"})

    # Update submission with AI scores
    overall_score = assessment.get("overallScore", 0)
    category_scores = assessment.get("categoryScores", {})

    # Convert category scores to simple number map for storage
    score_breakdown = {}
    detailed_categories = {}
    for category, data in category_scores.items():
        if isinstance(data, dict):
            score_breakdown[category] = Decimal(str(data.get("score", 0)))
            detailed_categories[category] = {
                "score": Decimal(str(data.get("score", 0))),
                "performanceLevel": data.get("performanceLevel", 1),
                "justification": data.get("justification", ""),
                "confidence": data.get("confidence", "low"),
            }
        else:
            score_breakdown[category] = Decimal(str(data))
            detailed_categories[category] = {"score": Decimal(str(data))}

    # Update DynamoDB
    update_expr = """SET aiScore = :score, 
                        aiScoreBreakdown = :breakdown,
                        aiAnalytics = :analytics,
                        updatedAt = :now"""

    submissions_table.update_item(
        Key={"submissionId": submission_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues={
            ":score": Decimal(str(overall_score)),
            ":breakdown": score_breakdown,
            ":analytics": {
                "overallScore": Decimal(str(overall_score)),
                "overallSummary": assessment.get("overallSummary", ""),
                "categoryScores": detailed_categories,
                "feedback": {
                    "strengths": assessment.get("strengths", []),
                    "improvements": assessment.get("improvements", []),
                    "evidence": assessment.get("evidenceCitations", []),
                },
                "generatedAt": datetime.utcnow().isoformat(),
                "model": ASSESSMENT_MODEL_ID,
            },
            ":now": datetime.utcnow().isoformat(),
        },
    )

    return response(
        200,
        {
            "message": "AI score generated successfully",
            "submissionId": submission_id,
            "aiScore": overall_score,
            "categoryScores": {k: float(v) for k, v in score_breakdown.items()},
            "summary": assessment.get("overallSummary", ""),
        },
    )


def generate_rubric_assessment(transcript: str, rubric: dict) -> dict:
    """Generate rubric-based assessment using Bedrock Claude."""

    rubric_description = ""
    for key, config in rubric.items():
        rubric_description += f"\n{key} (Weight: {config.get('weight', 0)}%):\n"
        rubric_description += f"  Name: {config.get('name', key)}\n"
        rubric_description += f"  Description: {config.get('description', '')}\n"

    prompt = f"""You are an expert educational assessor evaluating a student's oral defense of their group's financial case analysis.

## ASSESSMENT INSTRUCTIONS

Evaluate the student using this 6-dimension standardized rubric. For EACH dimension:

1. Assign a PERFORMANCE LEVEL (1-4):
   - Level 4 (Strong Command): 90-100 points
   - Level 3 (Competent Command): 75-89 points
   - Level 2 (Partial Command): 50-74 points
   - Level 1 (Insufficient Evidence): 0-49 points

2. Assign a SCORE within the level's range
3. Provide JUSTIFICATION with specific transcript evidence
4. Assess CONFIDENCE (high/moderate/low)

## RUBRIC DIMENSIONS
{rubric_description}

## TRANSCRIPT
{transcript}

## IMPORTANT
- Evaluate against the student's own submission, NOT a "correct" answer
- Alternative assumptions are acceptable when reasonable and well-defended
- Cite specific evidence from the transcript
- Calculate overall score as weighted average of category scores

Provide your assessment now."""

    tool_config = {
        "tools": [
            {
                "toolSpec": {
                    "name": "provide_assessment",
                    "description": "Provide structured rubric-based assessment",
                    "inputSchema": {
                        "json": {
                            "type": "object",
                            "properties": {
                                "overallScore": {
                                    "type": "number",
                                    "description": "Weighted overall score 0-100",
                                },
                                "overallSummary": {
                                    "type": "string",
                                    "description": "Brief narrative summary",
                                },
                                "categoryScores": {
                                    "type": "object",
                                    "properties": {
                                        cat: {
                                            "type": "object",
                                            "properties": {
                                                "performanceLevel": {
                                                    "type": "integer",
                                                    "minimum": 1,
                                                    "maximum": 4,
                                                },
                                                "score": {
                                                    "type": "number",
                                                    "minimum": 0,
                                                    "maximum": 100,
                                                },
                                                "justification": {"type": "string"},
                                                "confidence": {
                                                    "type": "string",
                                                    "enum": ["high", "moderate", "low"],
                                                },
                                            },
                                            "required": [
                                                "performanceLevel",
                                                "score",
                                                "justification",
                                                "confidence",
                                            ],
                                        }
                                        for cat in rubric.keys()
                                    },
                                },
                                "strengths": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "improvements": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "evidenceCitations": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                            "required": [
                                "overallScore",
                                "overallSummary",
                                "categoryScores",
                                "strengths",
                                "improvements",
                            ],
                        }
                    },
                }
            }
        ],
        "toolChoice": {"tool": {"name": "provide_assessment"}},
    }

    try:
        bedrock_response = bedrock.converse(
            modelId=ASSESSMENT_MODEL_ID,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            toolConfig=tool_config,
        )

        return bedrock_response["output"]["message"]["content"][0]["toolUse"]["input"]
    except Exception as e:
        print(f"Bedrock assessment error: {str(e)}")
        return None


def response(status_code: int, body: dict):
    """Format API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
        "body": json.dumps(body, default=str),
    }
