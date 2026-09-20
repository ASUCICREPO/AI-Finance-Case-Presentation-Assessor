"""
Persona CRUD Lambda
Handles create, read, update, delete operations for AI stakeholder personas.
Personas define the role, behavior, and questioning style of AI interviewers.
"""

import json
import os
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["PERSONAS_TABLE"])


def handler(event, context):
    """Main handler for Persona CRUD operations."""
    http_method = event.get("httpMethod", "")
    path_params = event.get("pathParameters") or {}
    persona_id = path_params.get("personaId")

    try:
        if http_method == "GET" and persona_id:
            return get_persona(persona_id)
        elif http_method == "GET":
            return list_personas()
        elif http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            return create_persona(body)
        elif http_method == "PUT" and persona_id:
            body = json.loads(event.get("body", "{}"))
            return update_persona(persona_id, body)
        elif http_method == "DELETE" and persona_id:
            return delete_persona(persona_id)
        else:
            return response(400, {"error": "Invalid request"})
    except Exception as e:
        print(f"Error: {str(e)}")
        return response(500, {"error": str(e)})


def create_persona(body):
    """Create a new stakeholder persona."""
    persona = {
        "personaID": str(uuid.uuid4()),
        "name": body.get("name", ""),
        "role": body.get("role", ""),
        "description": body.get("description", ""),
        "systemPrompt": body.get("systemPrompt", ""),
        "questionBank": body.get("questionBank", []),
        "assessmentFocus": body.get("assessmentFocus", []),
        "voiceId": body.get("voiceId", "matthew"),
        "useAnamAvatar": body.get("useAnamAvatar", False),
        "anamPersonaId": body.get("anamPersonaId"),
        "avatarId": body.get("avatarId"),
        "qaTimeLimitSec": body.get("qaTimeLimitSec", 900),
        "active": body.get("active", True),
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    # Remove None values
    persona = {k: v for k, v in persona.items() if v is not None}
    table.put_item(Item=persona)
    return response(201, persona)


def get_persona(persona_id):
    """Get a single persona by ID."""
    result = table.get_item(Key={"personaID": persona_id})
    item = result.get("Item")
    if not item:
        return response(404, {"error": "Persona not found"})
    return response(200, item)


def list_personas():
    """List all personas."""
    result = table.scan()
    return response(200, result.get("Items", []))


def update_persona(persona_id, body):
    """Update an existing persona."""
    body["updatedAt"] = datetime.utcnow().isoformat()
    update_expr = "SET " + ", ".join(f"#{k} = :{k}" for k in body.keys())
    expr_names = {f"#{k}": k for k in body.keys()}
    expr_values = {f":{k}": v for k, v in body.items()}

    table.update_item(
        Key={"personaID": persona_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )
    return response(200, {"personaID": persona_id, **body})


def delete_persona(persona_id):
    """Delete a persona."""
    table.delete_item(Key={"personaID": persona_id})
    return response(200, {"message": "Persona deleted", "personaID": persona_id})


def response(status_code, body):
    """Format API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body, default=str),
    }
