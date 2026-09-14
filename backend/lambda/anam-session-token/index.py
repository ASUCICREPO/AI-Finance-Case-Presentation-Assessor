"""Anam AI session token Lambda — exchanges API key for a short-lived session token."""

import json
import os
import logging
import urllib.request
import urllib.error

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ANAM_API_KEY = os.environ.get('ANAM_API_KEY', '')
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')


def get_cors_headers(event):
    """Return CORS headers based on the request origin."""
    origin = event.get('headers', {}).get('origin', '') or event.get('headers', {}).get('Origin', '')
    allowed_origin = ALLOWED_ORIGINS[0]
    if origin in ALLOWED_ORIGINS:
        allowed_origin = origin
    return {
        'Access-Control-Allow-Origin': allowed_origin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    }


def response(status_code, body, headers):
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body),
    }


def get_persona_details(persona_id, headers):
    """Fetch persona details including avatar image from Anam API."""
    if not ANAM_API_KEY:
        return response(500, {'error': 'ANAM_API_KEY not configured'}, headers)

    req = urllib.request.Request(
        f'https://api.anam.ai/v1/personas/{persona_id}',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ANAM_API_KEY}',
        },
        method='GET',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            # Extract relevant fields
            avatar = data.get('avatar', {})
            return response(200, {
                'id': data.get('id'),
                'name': data.get('name'),
                'description': data.get('description'),
                'avatar': {
                    'id': avatar.get('id'),
                    'displayName': avatar.get('displayName'),
                    'imageUrl': avatar.get('imageUrl'),
                    'videoUrl': avatar.get('videoUrl'),
                    'description': avatar.get('description'),
                }
            }, headers)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        logger.error(f'Anam API error: {e.code} - {error_body}')
        return response(502, {'error': f'Anam API error: {e.code}'}, headers)
    except Exception as e:
        logger.error(f'Failed to get Anam persona: {e}')
        return response(500, {'error': 'Failed to get persona details'}, headers)


def list_anam_avatars(headers):
    """Fetch all available avatars from Anam API."""
    if not ANAM_API_KEY:
        return response(500, {'error': 'ANAM_API_KEY not configured'}, headers)

    req = urllib.request.Request(
        'https://api.anam.ai/v1/avatars',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ANAM_API_KEY}',
        },
        method='GET',
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            avatars = data.get('items', data) if isinstance(data, dict) else data
            # Extract relevant fields for each avatar
            result = []
            for avatar in avatars if isinstance(avatars, list) else []:
                result.append({
                    'id': avatar.get('id'),
                    'displayName': avatar.get('displayName'),
                    'variantName': avatar.get('variantName'),
                    'imageUrl': avatar.get('imageUrl'),
                    'videoUrl': avatar.get('videoUrl'),
                    'description': avatar.get('description'),
                    'displayTags': avatar.get('displayTags', []),
                })
            return response(200, {'avatars': result}, headers)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        logger.error(f'Anam API error: {e.code} - {error_body}')
        return response(502, {'error': f'Anam API error: {e.code}'}, headers)
    except Exception as e:
        logger.error(f'Failed to list Anam avatars: {e}')
        return response(500, {'error': 'Failed to list avatars'}, headers)


def handler(event, context):
    """Handle Anam API requests."""
    headers = get_cors_headers(event)
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    query_params = event.get('queryStringParameters') or {}

    if http_method == 'OPTIONS':
        return response(200, {}, headers)

    # GET /anam-session?action=avatars - List all avatars
    if http_method == 'GET' and query_params.get('action') == 'avatars':
        return list_anam_avatars(headers)

    # GET /anam-session?action=persona&personaId=xxx - Get persona details
    if http_method == 'GET' and query_params.get('action') == 'persona':
        persona_id = query_params.get('personaId')
        if not persona_id:
            return response(400, {'error': 'Missing personaId parameter'}, headers)
        return get_persona_details(persona_id, headers)

    # POST /anam-session - Create session token (original functionality)
    if http_method == 'POST':
        return create_session_token(event, headers)

    return response(400, {'error': 'Invalid request'}, headers)


def create_session_token(event, headers):
    """Generate an Anam session token for the given persona."""
    if not ANAM_API_KEY:
        return response(500, {'error': 'ANAM_API_KEY not configured'}, headers)

    try:
        body = json.loads(event.get('body', '{}'))
    except (json.JSONDecodeError, TypeError):
        return response(400, {'error': 'Invalid request body'}, headers)

    anam_persona_id = body.get('anamPersonaId', '')
    if not anam_persona_id:
        return response(400, {'error': 'Missing anamPersonaId'}, headers)

    payload = json.dumps({
        'personaConfig': {
            'personaId': anam_persona_id,
        },
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.anam.ai/v1/auth/session-token',
        data=payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {ANAM_API_KEY}',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            session_token = data.get('sessionToken', '')
            if not session_token:
                return response(500, {'error': 'No session token in Anam response'}, headers)
            return response(200, {'sessionToken': session_token}, headers)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ''
        logger.error(f'Anam API error: {e.code} - {error_body}')
        return response(502, {'error': f'Anam API error: {e.code}'}, headers)
    except Exception as e:
        logger.error(f'Failed to get Anam session token: {e}')
        return response(500, {'error': 'Failed to get session token'}, headers)
