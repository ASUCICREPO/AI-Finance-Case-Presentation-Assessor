"""Anam AI session token Lambda — exchanges API key for a short-lived session token."""

import json
import os
import logging
import urllib.request
import urllib.error
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Secrets Manager client
secrets_client = boto3.client("secretsmanager")

# Get secret ARN from environment
ANAM_API_KEY_SECRET_ARN = os.environ.get("ANAM_API_KEY_SECRET_ARN", "")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Cache for API key
_anam_api_key_cache = None


def get_anam_api_key():
    """Retrieve Anam API key from Secrets Manager (with caching for Lambda warm starts)."""
    global _anam_api_key_cache

    if _anam_api_key_cache:
        return _anam_api_key_cache

    if not ANAM_API_KEY_SECRET_ARN:
        logger.error("ANAM_API_KEY_SECRET_ARN not configured")
        return None

    try:
        response = secrets_client.get_secret_value(SecretId=ANAM_API_KEY_SECRET_ARN)
        secret_string = response.get("SecretString", "")

        # Secret might be JSON or plain text
        try:
            secret_dict = json.loads(secret_string)
            api_key = (
                secret_dict.get("apiKey")
                or secret_dict.get("ANAM_API_KEY")
                or secret_string
            )
        except json.JSONDecodeError:
            api_key = secret_string

        _anam_api_key_cache = api_key.strip()
        logger.info("Successfully retrieved Anam API key from Secrets Manager")
        return _anam_api_key_cache

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            logger.error(f"Secret not found: {ANAM_API_KEY_SECRET_ARN}")
            logger.error(
                'Please create the secret: aws secretsmanager create-secret --name finance-assessor/anam-api-key --secret-string "your-anam-api-key"'
            )
        else:
            logger.error(f"Failed to retrieve secret: {error_code} - {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error retrieving secret: {e}")
        return None


def get_cors_headers(event):
    """Return CORS headers based on the request origin."""
    origin = event.get("headers", {}).get("origin", "") or event.get("headers", {}).get(
        "Origin", ""
    )
    allowed_origin = ALLOWED_ORIGINS[0]
    if origin in ALLOWED_ORIGINS:
        allowed_origin = origin
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    }


def response(status_code, body, headers):
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body),
    }


def get_persona_details(persona_id, headers):
    """Fetch persona details including avatar image from Anam API."""
    anam_api_key = get_anam_api_key()
    if not anam_api_key:
        return response(
            500, {"error": "ANAM_API_KEY not configured or secret not found"}, headers
        )

    req = urllib.request.Request(
        f"https://api.anam.ai/v1/personas/{persona_id}",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {anam_api_key}",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            # Extract relevant fields
            avatar = data.get("avatar", {})
            return response(
                200,
                {
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "description": data.get("description"),
                    "avatar": {
                        "id": avatar.get("id"),
                        "displayName": avatar.get("displayName"),
                        "imageUrl": avatar.get("imageUrl"),
                        "videoUrl": avatar.get("videoUrl"),
                        "description": avatar.get("description"),
                    },
                },
                headers,
            )
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.error(f"Anam API error: {e.code} - {error_body}")
        return response(502, {"error": f"Anam API error: {e.code}"}, headers)
    except Exception as e:
        logger.error(f"Failed to get Anam persona: {e}")
        return response(500, {"error": "Failed to get persona details"}, headers)


def list_anam_avatars(headers):
    """Fetch all available avatars from Anam API."""
    anam_api_key = get_anam_api_key()
    if not anam_api_key:
        return response(
            500, {"error": "ANAM_API_KEY not configured or secret not found"}, headers
        )

    req = urllib.request.Request(
        "https://api.anam.ai/v1/avatars",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {anam_api_key}",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            avatars = data.get("items", data) if isinstance(data, dict) else data
            # Extract relevant fields for each avatar
            result = []
            for avatar in avatars if isinstance(avatars, list) else []:
                result.append(
                    {
                        "id": avatar.get("id"),
                        "displayName": avatar.get("displayName"),
                        "variantName": avatar.get("variantName"),
                        "imageUrl": avatar.get("imageUrl"),
                        "videoUrl": avatar.get("videoUrl"),
                        "description": avatar.get("description"),
                        "displayTags": avatar.get("displayTags", []),
                    }
                )
            return response(200, {"avatars": result}, headers)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.error(f"Anam API error: {e.code} - {error_body}")
        return response(502, {"error": f"Anam API error: {e.code}"}, headers)
    except Exception as e:
        logger.error(f"Failed to list Anam avatars: {e}")
        return response(500, {"error": "Failed to list avatars"}, headers)


def handler(event, context):
    """Handle Anam API requests."""
    headers = get_cors_headers(event)
    http_method = event.get("httpMethod", "")
    path = event.get("path", "")
    query_params = event.get("queryStringParameters") or {}

    if http_method == "OPTIONS":
        return response(200, {}, headers)

    # GET /anam-session?action=avatars - List all avatars
    if http_method == "GET" and query_params.get("action") == "avatars":
        return list_anam_avatars(headers)

    # GET /anam-session?action=persona&personaId=xxx - Get persona details
    if http_method == "GET" and query_params.get("action") == "persona":
        persona_id = query_params.get("personaId")
        if not persona_id:
            return response(400, {"error": "Missing personaId parameter"}, headers)
        return get_persona_details(persona_id, headers)

    # POST /anam-session - Create session token (original functionality)
    if http_method == "POST":
        return create_session_token(event, headers)

    return response(400, {"error": "Invalid request"}, headers)


def create_session_token(event, headers):
    """Generate an Anam session token for the given persona.

    When enableAudioPassthrough is true, the session is configured for
    external audio input (lip-sync to Nova Sonic audio) instead of Anam's
    built-in TTS. This prevents the muffled/echoed audio issue.
    """
    anam_api_key = get_anam_api_key()
    if not anam_api_key:
        return response(
            500, {"error": "ANAM_API_KEY not configured or secret not found"}, headers
        )

    try:
        body = json.loads(event.get("body", "{}"))
    except (json.JSONDecodeError, TypeError):
        return response(400, {"error": "Invalid request body"}, headers)

    anam_persona_id = body.get("anamPersonaId", "")
    enable_audio_passthrough = body.get("enableAudioPassthrough", False)

    if not anam_persona_id:
        return response(400, {"error": "Missing anamPersonaId"}, headers)

    # Build persona config
    persona_config = {
        "personaId": anam_persona_id,
    }

    # Enable audio passthrough mode when using external audio (Nova Sonic)
    # This disables Anam's TTS - avatar will only lip-sync to audio we send
    if enable_audio_passthrough:
        persona_config["enableAudioPassthrough"] = True
        logger.info(
            f"Creating Anam session with AUDIO PASSTHROUGH mode for persona {anam_persona_id}"
        )

    payload = json.dumps(
        {
            "personaConfig": persona_config,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anam.ai/v1/auth/session-token",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {anam_api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            session_token = data.get("sessionToken", "")
            if not session_token:
                return response(
                    500, {"error": "No session token in Anam response"}, headers
                )
            return response(200, {"sessionToken": session_token}, headers)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else ""
        logger.error(f"Anam API error: {e.code} - {error_body}")
        return response(502, {"error": f"Anam API error: {e.code}"}, headers)
    except Exception as e:
        logger.error(f"Failed to get Anam session token: {e}")
        return response(500, {"error": "Failed to get session token"}, headers)
