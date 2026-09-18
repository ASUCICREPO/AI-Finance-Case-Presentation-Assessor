"""
Course Sessions CRUD Lambda
Handles class section management for the TA Dashboard.

Each course session represents a class section within a semester, e.g.:
- Spring 2026 - Morning
- Spring 2026 - Evening
- Fall 2026 - Session 1
- Fall 2026 - Session 2

Session numbers can be: 'morning', 'evening', '1', '2', '3', etc.
"""

import json
import os
import uuid
from datetime import datetime
from decimal import Decimal
import boto3
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB
dynamodb = boto3.resource("dynamodb")
course_sessions_table = dynamodb.Table(
    os.environ.get("COURSE_SESSIONS_TABLE", "CourseSessionsTable")
)
students_table = dynamodb.Table(os.environ.get("STUDENTS_TABLE", "StudentsTable"))
groups_table = dynamodb.Table(os.environ.get("GROUPS_TABLE", "GroupsTable"))

# CORS headers
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
}


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        # Convert to int if it's a whole number, else float
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def response(status_code, body):
    """Standard API response."""
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=decimal_default),
    }


def get_all_sessions(query_params):
    """Get all course sessions with optional filtering."""
    try:
        status_filter = query_params.get("status") if query_params else None
        semester_filter = query_params.get("semester") if query_params else None

        if status_filter:
            # Query by status using GSI
            result = course_sessions_table.query(
                IndexName="status-index",
                KeyConditionExpression=Key("status").eq(status_filter),
            )
            sessions = result.get("Items", [])
        elif semester_filter:
            # Query by semester using GSI
            result = course_sessions_table.query(
                IndexName="semesterYear-index",
                KeyConditionExpression=Key("semester").eq(semester_filter),
            )
            sessions = result.get("Items", [])
        else:
            # Scan all sessions
            result = course_sessions_table.scan()
            sessions = result.get("Items", [])

            # Handle pagination
            while "LastEvaluatedKey" in result:
                result = course_sessions_table.scan(
                    ExclusiveStartKey=result["LastEvaluatedKey"]
                )
                sessions.extend(result.get("Items", []))

        # Enrich with student/group counts if not cached
        for session in sessions:
            session_id = session.get("courseSessionId")
            if session.get("studentCount") is None:
                session["studentCount"] = _count_students_in_session(session_id)
            if session.get("groupCount") is None:
                session["groupCount"] = _count_groups_in_session(session_id)

        # Sort by year desc, then semester order
        semester_order = {"Spring": 1, "Summer": 2, "Fall": 3, "Winter": 4}
        sessions.sort(
            key=lambda s: (
                -int(s.get("year", 0)),
                semester_order.get(s.get("semester", ""), 5),
                s.get("sessionNumber", s.get("sessionType", "")),
            )
        )

        return response(200, {"sessions": sessions, "count": len(sessions)})
    except Exception as e:
        print(f"Error getting sessions: {str(e)}")
        return response(500, {"error": str(e)})


def _count_students_in_session(session_id):
    """Count students enrolled in a session."""
    try:
        # Students are linked via courseSessionId field
        result = students_table.scan(
            FilterExpression="courseSessionId = :sid",
            ExpressionAttributeValues={":sid": session_id},
        )
        return len(result.get("Items", []))
    except Exception:
        return 0


def _count_groups_in_session(session_id):
    """Count groups in a session."""
    try:
        result = groups_table.scan(
            FilterExpression="courseSessionId = :sid",
            ExpressionAttributeValues={":sid": session_id},
        )
        return len(result.get("Items", []))
    except Exception:
        return 0


def get_session_by_id(session_id):
    """Get a single course session by ID."""
    try:
        result = course_sessions_table.get_item(Key={"courseSessionId": session_id})
        session = result.get("Item")

        if not session:
            return response(404, {"error": "Course session not found"})

        # Enrich with current counts
        session["studentCount"] = _count_students_in_session(session_id)
        session["groupCount"] = _count_groups_in_session(session_id)

        return response(200, session)
    except Exception as e:
        print(f"Error getting session: {str(e)}")
        return response(500, {"error": str(e)})


def create_session(body):
    """Create a new course session."""
    try:
        # Validate required fields - sessionNumber OR sessionType accepted
        session_number = body.get("sessionNumber") or body.get("sessionType")
        if not session_number:
            return response(400, {"error": "Missing required field: sessionNumber"})

        required_fields = ["name", "courseName", "courseCode", "semester", "year"]
        for field in required_fields:
            if field not in body:
                return response(400, {"error": f"Missing required field: {field}"})

        # sessionNumber can be anything: 'morning', 'evening', '1', '2', '3', etc.
        session_number = str(session_number).lower()

        # Validate semester
        valid_semesters = ["Spring", "Summer", "Fall", "Winter"]
        if body["semester"] not in valid_semesters:
            return response(
                400, {"error": f"Invalid semester. Must be one of: {valid_semesters}"}
            )

        session_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Determine initial status based on dates
        start_date = body.get("startDate", "")
        status = body.get("status", "upcoming")

        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace("Z", ""))
                now = datetime.utcnow()
                end_date = body.get("endDate", "")

                if end_date:
                    end_dt = datetime.fromisoformat(end_date.replace("Z", ""))
                    if now > end_dt:
                        status = "archived"
                    elif now >= start_dt:
                        status = "active"
                    else:
                        status = "upcoming"
                elif now >= start_dt:
                    status = "active"
            except ValueError:
                pass  # Keep default status

        session = {
            "courseSessionId": session_id,
            "sessionId": session_id,  # Alias for frontend compatibility
            "name": body["name"],
            "sessionNumber": session_number,  # e.g., 'morning', 'evening', '1', '2'
            "sessionType": session_number,  # Alias for backward compatibility
            "courseName": body["courseName"],
            "courseCode": body["courseCode"],
            "semester": body["semester"],
            "year": int(body["year"]),
            "startDate": body.get("startDate", ""),
            "endDate": body.get("endDate", ""),
            "studentCount": 0,
            "groupCount": 0,
            "status": status,
            "description": body.get("description", ""),
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        course_sessions_table.put_item(Item=session)

        return response(201, session)
    except Exception as e:
        print(f"Error creating session: {str(e)}")
        return response(500, {"error": str(e)})


def update_session(session_id, body):
    """Update an existing course session."""
    try:
        # Check if session exists
        existing = course_sessions_table.get_item(Key={"courseSessionId": session_id})
        if not existing.get("Item"):
            return response(404, {"error": "Course session not found"})

        timestamp = datetime.utcnow().isoformat() + "Z"

        # Build update expression
        update_expr = "SET updatedAt = :updated"
        expr_values = {":updated": timestamp}
        expr_names = {}

        allowed_fields = [
            "name",
            "sessionNumber",
            "sessionType",
            "courseName",
            "courseCode",
            "semester",
            "year",
            "startDate",
            "endDate",
            "status",
            "description",
            "studentCount",
            "groupCount",
        ]

        for field in allowed_fields:
            if field in body:
                # Handle reserved words
                if field == "name":
                    update_expr += ", #name = :name"
                    expr_names["#name"] = "name"
                    expr_values[":name"] = body[field]
                elif field == "status":
                    update_expr += ", #status = :status"
                    expr_names["#status"] = "status"
                    expr_values[":status"] = body[field]
                elif field == "year":
                    update_expr += f", {field} = :{field}"
                    expr_values[f":{field}"] = int(body[field])
                elif field == "sessionNumber":
                    # Update both sessionNumber and sessionType for compatibility
                    update_expr += (
                        ", sessionNumber = :sessionNumber, sessionType = :sessionType"
                    )
                    expr_values[":sessionNumber"] = str(body[field]).lower()
                    expr_values[":sessionType"] = str(body[field]).lower()
                elif field == "sessionType":
                    # If only sessionType provided, update both
                    if "sessionNumber" not in body:
                        update_expr += ", sessionNumber = :sessionNumber, sessionType = :sessionType"
                        expr_values[":sessionNumber"] = str(body[field]).lower()
                        expr_values[":sessionType"] = str(body[field]).lower()
                else:
                    update_expr += f", {field} = :{field}"
                    expr_values[f":{field}"] = body[field]

        update_params = {
            "Key": {"courseSessionId": session_id},
            "UpdateExpression": update_expr,
            "ExpressionAttributeValues": expr_values,
            "ReturnValues": "ALL_NEW",
        }

        if expr_names:
            update_params["ExpressionAttributeNames"] = expr_names

        result = course_sessions_table.update_item(**update_params)
        updated_session = result["Attributes"]

        # Add sessionId alias for frontend
        updated_session["sessionId"] = updated_session.get("courseSessionId")

        return response(200, updated_session)
    except Exception as e:
        print(f"Error updating session: {str(e)}")
        return response(500, {"error": str(e)})


def archive_session(session_id):
    """Archive a course session (soft delete)."""
    try:
        # Check if session exists
        existing = course_sessions_table.get_item(Key={"courseSessionId": session_id})
        if not existing.get("Item"):
            return response(404, {"error": "Course session not found"})

        timestamp = datetime.utcnow().isoformat() + "Z"

        result = course_sessions_table.update_item(
            Key={"courseSessionId": session_id},
            UpdateExpression="SET #status = :status, updatedAt = :updated",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={":status": "archived", ":updated": timestamp},
            ReturnValues="ALL_NEW",
        )

        return response(
            200,
            {
                "message": "Session archived successfully",
                "session": result["Attributes"],
            },
        )
    except Exception as e:
        print(f"Error archiving session: {str(e)}")
        return response(500, {"error": str(e)})


def delete_session(session_id):
    """Permanently delete a course session."""
    try:
        # Check if session exists
        existing = course_sessions_table.get_item(Key={"courseSessionId": session_id})
        if not existing.get("Item"):
            return response(404, {"error": "Course session not found"})

        # Check if there are students/groups assigned
        student_count = _count_students_in_session(session_id)
        group_count = _count_groups_in_session(session_id)

        if student_count > 0 or group_count > 0:
            return response(
                400,
                {
                    "error": "Cannot delete session with students or groups. Archive it instead.",
                    "studentCount": student_count,
                    "groupCount": group_count,
                },
            )

        course_sessions_table.delete_item(Key={"courseSessionId": session_id})

        return response(200, {"message": "Session deleted successfully"})
    except Exception as e:
        print(f"Error deleting session: {str(e)}")
        return response(500, {"error": str(e)})


def duplicate_session(session_id, body):
    """Duplicate an existing session with a new name."""
    try:
        # Get existing session
        existing = course_sessions_table.get_item(Key={"courseSessionId": session_id})
        if not existing.get("Item"):
            return response(404, {"error": "Course session not found"})

        original = existing["Item"]
        new_session_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Create new session based on original
        session_number = (
            body.get("sessionNumber")
            or body.get("sessionType")
            or original.get("sessionNumber")
            or original.get("sessionType")
        )
        new_session = {
            "courseSessionId": new_session_id,
            "sessionId": new_session_id,
            "name": body.get("name", f"{original.get('name', 'Session')} (Copy)"),
            "sessionNumber": str(session_number).lower() if session_number else "",
            "sessionType": str(session_number).lower() if session_number else "",
            "courseName": body.get("courseName", original.get("courseName")),
            "courseCode": body.get("courseCode", original.get("courseCode")),
            "semester": body.get("semester", original.get("semester")),
            "year": int(body.get("year", original.get("year", datetime.utcnow().year))),
            "startDate": body.get("startDate", ""),
            "endDate": body.get("endDate", ""),
            "studentCount": 0,
            "groupCount": 0,
            "status": "upcoming",
            "description": body.get("description", original.get("description", "")),
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }

        course_sessions_table.put_item(Item=new_session)

        return response(201, new_session)
    except Exception as e:
        print(f"Error duplicating session: {str(e)}")
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

    # Extract session ID from path params
    session_id = path_params.get("sessionId")

    # Route requests

    # Archive endpoint: POST /course-sessions/{sessionId}/archive
    if session_id and "/archive" in path:
        if http_method == "POST":
            return archive_session(session_id)
        return response(405, {"error": "Method not allowed"})

    # Duplicate endpoint: POST /course-sessions/{sessionId}/duplicate
    if session_id and "/duplicate" in path:
        if http_method == "POST":
            return duplicate_session(session_id, body)
        return response(405, {"error": "Method not allowed"})

    # Standard CRUD operations
    if session_id:
        if http_method == "GET":
            return get_session_by_id(session_id)
        elif http_method == "PUT":
            return update_session(session_id, body)
        elif http_method == "DELETE":
            return delete_session(session_id)
    else:
        if http_method == "GET":
            return get_all_sessions(query_params)
        elif http_method == "POST":
            return create_session(body)

    return response(405, {"error": "Method not allowed"})
