"""
Assessments CRUD Lambda
Handles assessment management for TA Dashboard.
Assessments are assigned to session/group combinations.
"""

import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB
dynamodb = boto3.resource("dynamodb")
assessments_table = dynamodb.Table(
    os.environ.get("ASSESSMENTS_TABLE", "AssessmentsTable")
)
groups_table = dynamodb.Table(os.environ.get("GROUPS_TABLE", "GroupsTable"))
students_table = dynamodb.Table(os.environ.get("STUDENTS_TABLE", "StudentsTable"))

# CORS headers
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def response(status_code, body):
    """Standard API response."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=decimal_default),
    }


def get_all_assessments(query_params):
    """Get all assessments with optional filtering."""
    try:
        status = query_params.get("status") if query_params else None
        session_number = query_params.get("sessionNumber") if query_params else None

        # Scan all assessments
        result = assessments_table.scan()
        assessments = result.get("Items", [])

        # Handle pagination
        while "LastEvaluatedKey" in result:
            result = assessments_table.scan(
                ExclusiveStartKey=result["LastEvaluatedKey"]
            )
            assessments.extend(result.get("Items", []))

        # Apply filters
        if status:
            assessments = [a for a in assessments if a.get("status") == status]
        if session_number:
            assessments = [
                a
                for a in assessments
                if session_number in a.get("assignedSessions", [])
            ]

        return response(200, {"assessments": assessments, "count": len(assessments)})
    except Exception as e:
        print(f"Error getting assessments: {str(e)}")
        return response(500, {"error": str(e)})


def get_assessment_by_id(assessment_id):
    """Get a single assessment by ID."""
    try:
        result = assessments_table.get_item(Key={"assessmentID": assessment_id})
        assessment = result.get("Item")

        if not assessment:
            return response(404, {"error": "Assessment not found"})

        return response(200, assessment)
    except Exception as e:
        print(f"Error getting assessment: {str(e)}")
        return response(500, {"error": str(e)})


def create_assessment(body):
    """Create a new assessment."""
    try:
        # Validate required fields
        required_fields = ["title"]
        for field in required_fields:
            if field not in body:
                return response(400, {"error": f"Missing required field: {field}"})

        assessment_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"

        assessment = {
            "assessmentID": assessment_id,
            "title": body["title"],
            "description": body.get("description", ""),
            "caseName": body.get("caseName", body["title"]),
            "module": body.get("module", ""),
            "personaId": body.get("personaId"),
            "dueDate": body.get("dueDate"),
            "duration": body.get("duration", 15),  # Default 15 minutes
            "assignedSessions": body.get(
                "assignedSessions", []
            ),  # List of session numbers ["1", "2"]
            "assignedGroups": body.get(
                "assignedGroups", []
            ),  # List of group numbers ["1", "2", "3"]
            "materials": body.get("materials", []),
            "rubric": body.get(
                "rubric",
                {"clarity": 25, "accuracy": 25, "analysis": 25, "professionalism": 25},
            ),
            "status": body.get("status", "draft"),  # draft, published, closed
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        assessments_table.put_item(Item=assessment)

        return response(201, assessment)
    except Exception as e:
        print(f"Error creating assessment: {str(e)}")
        return response(500, {"error": str(e)})


def update_assessment(assessment_id, body):
    """Update an existing assessment."""
    try:
        # Check if assessment exists
        existing = assessments_table.get_item(Key={"assessmentID": assessment_id})
        if not existing.get("Item"):
            return response(404, {"error": "Assessment not found"})

        timestamp = datetime.utcnow().isoformat() + "Z"

        # Build update expression - use expression attribute names for all fields
        # to avoid reserved keyword issues (status, duration, etc. are reserved)
        update_expr = "SET #updatedAt = :updated"
        expr_values = {":updated": timestamp}
        expr_names = {"#updatedAt": "updatedAt"}

        allowed_fields = [
            "title",
            "description",
            "caseName",
            "module",
            "personaId",
            "dueDate",
            "duration",
            "assignedSessions",
            "assignedGroups",
            "materials",
            "rubric",
            "status",
        ]

        for field in allowed_fields:
            if field in body:
                # Use expression attribute names for all fields to avoid reserved keyword issues
                update_expr += f", #{field} = :{field}"
                expr_names[f"#{field}"] = field
                expr_values[f":{field}"] = body[field]

        update_params = {
            "Key": {"assessmentID": assessment_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": expr_values,
            "ExpressionAttributeNames": expr_names,
            "ReturnValues": "ALL_NEW",
        }

        result = assessments_table.update_item(**update_params)

        return response(200, result["Attributes"])
    except Exception as e:
        print(f"Error updating assessment: {str(e)}")
        return response(500, {"error": str(e)})


def delete_assessment(assessment_id):
    """Delete an assessment."""
    try:
        # Check if assessment exists
        existing = assessments_table.get_item(Key={"assessmentID": assessment_id})
        if not existing.get("Item"):
            return response(404, {"error": "Assessment not found"})

        assessments_table.delete_item(Key={"assessmentID": assessment_id})

        return response(200, {"message": "Assessment deleted successfully"})
    except Exception as e:
        print(f"Error deleting assessment: {str(e)}")
        return response(500, {"error": str(e)})


def get_student_assessments(query_params):
    """
    Get assessments assigned to a specific student based on their session/group.
    Called by student dashboard to show their assigned assessments.
    """
    try:
        student_id = query_params.get("studentId") if query_params else None
        student_email = query_params.get("email") if query_params else None
        session_number = query_params.get("sessionNumber") if query_params else None
        group_number = query_params.get("groupNumber") if query_params else None

        # If studentId provided, look up their session/group
        student = None
        if student_id:
            student_result = students_table.get_item(Key={"studentId": student_id})
            student = student_result.get("Item")

        # If not found by studentId, try by email
        if not student and student_email:
            # Scan for student by email
            result = students_table.scan(
                FilterExpression=Attr("email").eq(student_email)
            )
            items = result.get("Items", [])
            if items:
                student = items[0]

        if student:
            session_number = session_number or student.get("sessionNumber")
            group_number = group_number or student.get("groupNumber")

        if not session_number or not group_number:
            return response(
                400, {"error": "Student session/group information not found"}
            )

        # Get all published assessments
        result = assessments_table.scan(FilterExpression=Attr("status").eq("published"))
        all_assessments = result.get("Items", [])

        # Handle pagination
        while "LastEvaluatedKey" in result:
            result = assessments_table.scan(
                FilterExpression=Attr("status").eq("published"),
                ExclusiveStartKey=result["LastEvaluatedKey"],
            )
            all_assessments.extend(result.get("Items", []))

        # Filter to assessments assigned to this student's session/group
        student_assessments = []
        for assessment in all_assessments:
            assigned_sessions = assessment.get("assignedSessions", [])
            assigned_groups = assessment.get("assignedGroups", [])

            # Check if student's session and group are both in the assigned lists
            # If assignedSessions/Groups are empty, assessment is available to all
            session_match = (
                not assigned_sessions or str(session_number) in assigned_sessions
            )
            group_match = not assigned_groups or str(group_number) in assigned_groups

            if session_match and group_match:
                # Return only necessary fields for student view
                student_assessments.append(
                    {
                        "assessmentId": assessment["assessmentID"],
                        "title": assessment.get("title"),
                        "description": assessment.get("description"),
                        "caseName": assessment.get("caseName"),
                        "module": assessment.get("module"),
                        "dueDate": assessment.get("dueDate"),
                        "duration": assessment.get("duration", 15),
                        "personaId": assessment.get("personaId"),
                    }
                )

        return response(
            200,
            {
                "assessments": student_assessments,
                "count": len(student_assessments),
                "sessionNumber": session_number,
                "groupNumber": group_number,
            },
        )
    except Exception as e:
        print(f"Error getting student assessments: {str(e)}")
        return response(500, {"error": str(e)})


def assign_to_groups(assessment_id, body):
    """Assign an assessment to specific session/group combinations."""
    try:
        # Get assessment
        existing = assessments_table.get_item(Key={"assessmentID": assessment_id})
        if not existing.get("Item"):
            return response(404, {"error": "Assessment not found"})

        timestamp = datetime.utcnow().isoformat() + "Z"

        assigned_sessions = body.get("sessionNumbers", [])
        assigned_groups = body.get("groupNumbers", [])

        result = assessments_table.update_item(
            Key={"assessmentID": assessment_id},
            UpdateExpression="SET assignedSessions = :sessions, assignedGroups = :groups, updatedAt = :ts",
            ExpressionAttributeValues={
                ":sessions": assigned_sessions,
                ":groups": assigned_groups,
                ":ts": timestamp,
            },
            ReturnValues="ALL_NEW",
        )

        return response(200, result["Attributes"])
    except Exception as e:
        print(f"Error assigning assessment: {str(e)}")
        return response(500, {"error": str(e)})


def handler(event, context):
    """Main Lambda handler."""
    print(f"Event: {json.dumps(event)}")

    http_method = event.get("httpMethod", "")
    path = event.get("path", "")
    path_params = event.get("pathParameters") or {}
    query_params = event.get("queryStringParameters") or {}

    # Parse body
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except json.JSONDecodeError:
            return response(400, {"error": "Invalid JSON body"})

    assessment_id = path_params.get("assessmentId")

    # Student assessments endpoint (by studentId query param)
    if "/student" in path or query_params.get("studentId"):
        if http_method == "GET":
            return get_student_assessments(query_params)
        return response(405, {"error": "Method not allowed"})

    # Assign to groups endpoint
    if "/assign" in path and assessment_id:
        if http_method == "POST":
            return assign_to_groups(assessment_id, body)
        return response(405, {"error": "Method not allowed"})

    # Standard CRUD
    if assessment_id:
        if http_method == "GET":
            return get_assessment_by_id(assessment_id)
        elif http_method == "PUT":
            return update_assessment(assessment_id, body)
        elif http_method == "DELETE":
            return delete_assessment(assessment_id)
    else:
        if http_method == "GET":
            return get_all_assessments(query_params)
        elif http_method == "POST":
            return create_assessment(body)

    return response(405, {"error": "Method not allowed"})
