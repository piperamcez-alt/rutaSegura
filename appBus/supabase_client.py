"""
Cliente mínimo para Supabase (Auth + PostgREST) usando la API HTTP.

Vive solo en el backend: las credenciales salen de settings (variables de
entorno) y nunca se envían al navegador. Se usa `requests` a propósito para
no depender de SDKs pesados.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
TIMEOUT = 10  # segundos


class SupabaseError(Exception):
    """Error devuelto por Supabase o al intentar conectarse."""

    def __init__(self, message, status=502, code=''):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def is_configured():
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


def _headers(access_token=None, extra=None):
    headers = {
        'apikey': settings.SUPABASE_KEY,
        'Authorization': f'Bearer {access_token or settings.SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    if extra:
        headers.update(extra)
    return headers


def _request(method, path, *, json=None, params=None, access_token=None, headers=None):
    if not is_configured():
        raise SupabaseError(
            'Supabase no está configurado. Define SUPABASE_URL y SUPABASE_KEY en el archivo .env.',
            status=503, code='not_configured',
        )
    try:
        response = requests.request(
            method,
            f'{settings.SUPABASE_URL}{path}',
            json=json,
            params=params,
            headers=_headers(access_token, headers),
            timeout=TIMEOUT,
        )
    except requests.RequestException:
        logger.exception('No se pudo contactar a Supabase (%s %s)', method, path)
        raise SupabaseError(
            'No se pudo conectar con el servicio de cuentas. Inténtalo en unos minutos.',
            status=503, code='unreachable',
        )

    try:
        data = response.json() if response.content else {}
    except ValueError:
        data = {}

    if response.status_code >= 400:
        message = ''
        code = ''
        if isinstance(data, dict):
            message = data.get('msg') or data.get('message') or data.get('error_description') or data.get('error') or ''
            code = str(data.get('error_code') or data.get('code') or data.get('error') or '')
        raise SupabaseError(message or 'Error de Supabase.', status=response.status_code, code=code)
    return data


# ── Auth (GoTrue) ────────────────────────────────────────────────────────────

def sign_up(email, password, metadata):
    return _request('POST', '/auth/v1/signup', json={'email': email, 'password': password, 'data': metadata})


def sign_in(email, password):
    return _request('POST', '/auth/v1/token', params={'grant_type': 'password'},
                    json={'email': email, 'password': password})


def refresh_session(refresh_token):
    return _request('POST', '/auth/v1/token', params={'grant_type': 'refresh_token'},
                    json={'refresh_token': refresh_token})


def sign_out(access_token):
    try:
        _request('POST', '/auth/v1/logout', access_token=access_token)
    except SupabaseError:
        logger.info('No se pudo revocar la sesión en Supabase (se cierra igualmente la local).')


from .security import is_safe_identifier

ALLOWED_PROFILE_COLUMNS = {'id', 'nombre', 'apellido', 'correo', 'nombre_alumno', 'curso', 'rol'}

# ── Tabla usuarios (PostgREST, protegida por RLS con el JWT del usuario) ─────

def get_profile(access_token, user_id):
    if not is_safe_identifier(str(user_id or '')):
        raise SupabaseError('Identificador de usuario inválido o sospechoso.', status=400, code='invalid_id')
    rows = _request('GET', '/rest/v1/usuarios', access_token=access_token,
                    params={'id': f'eq.{user_id}', 'select': '*', 'limit': '1'})
    return rows[0] if rows else None


def create_profile(access_token, profile):
    """Inserta el perfil si aún no existe (la fila normalmente la crea el trigger)."""
    if not isinstance(profile, dict) or not is_safe_identifier(str(profile.get('id') or '')):
        raise SupabaseError('Datos de perfil inválidos.', status=400, code='invalid_profile')
    sanitized = {k: v for k, v in profile.items() if k in ALLOWED_PROFILE_COLUMNS}
    _request('POST', '/rest/v1/usuarios', access_token=access_token, json=sanitized,
             params={'on_conflict': 'id'},
             headers={'Prefer': 'resolution=ignore-duplicates,return=minimal'})
