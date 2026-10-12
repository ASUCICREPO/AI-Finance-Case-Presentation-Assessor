"""
Lambda function to validate admin access code for instructor signup.
The actual access code is stored as an environment variable, never in code.
"""

import json
import os


def handler(event, context):
    """Validate the admin access code."""
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        provided_code = body.get("accessCode", "")

        # Get the secret access code from environment variable
        # This is set in CDK/CloudFormation, NOT in the code
        valid_code = os.environ.get("ADMIN_ACCESS_CODE", "")

        if not valid_code:
            # No access code configured - reject all admin signups
            return response(403, {
                "valid": False,
                "error": "Admin signup is currently disabled"
            })

        # Validate the code (case-sensitive)
        if provided_code == valid_code:
            return response(200, {"valid": True})
        else:
            return response(403, {
                "valid": False,
                "error": "Invalid access code"
            })

    except Exception as e:
        print(f"Error validating access code: {str(e)}")
        return response(500, {"valid": False, "error": "Validation failed"})


def response(status_code: int, body: dict):
    """Return a JSON response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        "body": json.dumps(body),
    }
