import json
import logging
import time
import uuid

from django.db import connection
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from . import supabase_client as sb
from .security import get_client_ip, has_sql_injection, is_rate_limited
from .supabase_client import SupabaseError
from .validators import EMAIL_RE, validate_registration

logger = logging.getLogger(__name__)
SESSION_KEY = 'sb_session'
REFRESH_MARGIN = 60  # renovar el token si le queda menos de 1 minuto
MAX_BODY_BYTES = 32 * 1024  # 32 KB límite contra ataques de denegación de servicio (DoS)


# ── Utilidades ───────────────────────────────────────────────────────────────

def _json_body(request):
    raw = request.body or b''
    if len(raw) > MAX_BODY_BYTES:
        logger.warning('Cuerpo de solicitud descartado por exceso de tamaño (%s bytes)', len(raw))
        return None
    try:
        body = json.loads(raw or b'{}')
    except (ValueError, UnicodeDecodeError):
        return None
    return body if isinstance(body, dict) else None


def _error(message, status=400, field_errors=None):
    return JsonResponse({'error': message, 'fieldErrors': field_errors or {}}, status=status)


def _public_user(profile):
    """Perfil de la tabla `usuarios` con la forma que espera el frontend."""
    return {
        'id': profile['id'],
        'name': profile.get('nombre', ''),
        'lastName': profile.get('apellido', ''),
        'email': profile.get('correo', ''),
        'role': profile.get('rol', 'apoderado'),
        'childName': profile.get('nombre_alumno') or '',
        'grade': profile.get('curso') or '',
    }


def _profile_from_metadata(user):
    meta = user.get('user_metadata') or {}
    return {
        'id': user['id'],
        'nombre': meta.get('nombre', ''),
        'apellido': meta.get('apellido', ''),
        'correo': user.get('email', ''),
        'nombre_alumno': meta.get('nombre_alumno', ''),
        'curso': meta.get('curso', ''),
        'rol': meta.get('rol', 'apoderado'),
    }


def _ensure_profile(access_token, user):
    """Devuelve el perfil del usuario; si el trigger no lo creó, lo inserta.
    Si la tabla tiene problemas de permisos o esquema, devuelve el perfil
    basado en los metadatos del JWT como fallback.
    """
    try:
        profile = sb.get_profile(access_token, user['id'])
        if profile:
            return profile
        fallback = _profile_from_metadata(user)
        try:
            sb.create_profile(access_token, fallback)
            return sb.get_profile(access_token, user['id']) or fallback
        except SupabaseError:
            logger.warning('No se pudo crear perfil en usuarios; usando metadata del JWT')
            return fallback
    except SupabaseError:
        logger.warning('No se pudo leer perfil de usuarios; usando metadata del JWT')
        return _profile_from_metadata(user)


def _store_session(request, data, profile):
    request.session.cycle_key()  # evita fijación de sesión
    request.session[SESSION_KEY] = {
        'access_token': data['access_token'],
        'refresh_token': data.get('refresh_token', ''),
        'expires_at': data.get('expires_at') or int(time.time()) + int(data.get('expires_in', 3600)),
        'profile': _public_user(profile),
    }


def _supabase_message(exc, default):
    """Traduce los errores de Supabase a mensajes claros en español."""
    code, msg = exc.code, exc.message.lower()
    if code in ('user_already_exists', 'email_exists') or 'already registered' in msg:
        return 'Ya existe un usuario registrado con este correo electrónico.'
    if code == 'weak_password':
        return 'La contraseña es demasiado débil. Usa una más larga y variada.'
    if code in ('over_email_send_rate_limit', 'over_request_rate_limit') or exc.status == 429:
        return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    if code in ('email_address_invalid', 'validation_failed') and 'email' in msg:
        return 'Ingresa un correo electrónico válido.'
    if code == 'signup_disabled':
        return 'El registro de nuevos usuarios está deshabilitado.'
    if code in ('invalid_credentials', 'invalid_grant') or 'invalid login' in msg:
        return 'Correo o contraseña incorrectos.'
    if code == 'email_not_confirmed' or 'not confirmed' in msg:
        return 'Debes confirmar tu correo electrónico antes de iniciar sesión.'
    if code in ('42501', 'PGRST301') or exc.status == 403:
        return 'Error de permisos en la base de datos. Contacta al administrador.'
    if exc.status in (503,):
        return exc.message
    return default


# ── Página principal ─────────────────────────────────────────────────────────

@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')


# ── API de autenticación ─────────────────────────────────────────────────────

def _save_student_to_db(user_id, data):
    """Guarda al apoderado en la tabla `usuarios` y a su alumno en `escolares` directamente."""
    if not user_id:
        return
    try:
        with connection.cursor() as cursor:
            # 1. Asegurar registro en public.usuarios con datos del alumno
            cursor.execute("""
                INSERT INTO public.usuarios (id, correo, nombre, apellido, nombre_alumno, curso, rol)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    correo = EXCLUDED.correo,
                    nombre = EXCLUDED.nombre,
                    apellido = EXCLUDED.apellido,
                    nombre_alumno = EXCLUDED.nombre_alumno,
                    curso = EXCLUDED.curso,
                    rol = EXCLUDED.rol;
            """, [
                str(user_id),
                data['correo'],
                data['nombre'],
                data['apellido'],
                data.get('nombre_alumno') or None,
                data.get('curso') or None,
                data.get('rol', 'apoderado'),
            ])

            # 2. Si el rol es apoderado y se ingresó alumno, insertarlo en escolares
            if data.get('rol') == 'apoderado' and data.get('nombre_alumno'):
                child_name = data['nombre_alumno'].strip()
                grade = (data.get('curso') or 'Básico').strip()
                # Verificar si ya existe este alumno para este apoderado
                cursor.execute("""
                    SELECT id FROM public.escolares
                    WHERE id_apoderado = %s AND LOWER(nombre_completo) = LOWER(%s);
                """, [str(user_id), child_name])
                existing = cursor.fetchone()

                if not existing:
                    cursor.execute("SELECT COALESCE(MAX(parada_id), 0) + 1 FROM public.escolares;")
                    row = cursor.fetchone()
                    next_stop = row[0] if row else 1
                    new_student_id = str(uuid.uuid4())
                    cursor.execute("""
                        INSERT INTO public.escolares (
                            id, nombre_completo, direccion_hogar, grado,
                            parada_id, id_apoderado, asiste_hoy, estado_actual, codigo_retiro
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                    """, [
                        new_student_id,
                        child_name,
                        'Dirección registrada del alumno',
                        grade,
                        next_stop,
                        str(user_id),
                        True,
                        'esperando',
                        '4829'
                    ])
                    logger.info('Alumno %s (%s) guardado en escolares con id %s', child_name, grade, new_student_id)
    except Exception as exc:
        logger.exception('Error al guardar apoderado/alumno en base de datos: %s', exc)


@require_POST
def register(request):
    ip = get_client_ip(request)
    if is_rate_limited(ip, 'register', limit=6, window_seconds=60):
        return _error('Demasiadas solicitudes de registro desde esta conexión. Espera un momento.', 429)

    body = _json_body(request)
    if body is None:
        return _error('Solicitud inválida.')

    data, password, field_errors = validate_registration(body)
    if field_errors:
        return _error('Revisa los datos ingresados.', 422, field_errors)

    try:
        result = sb.sign_up(data['correo'], password, {
            'nombre': data['nombre'], 'apellido': data['apellido'],
            'nombre_alumno': data['nombre_alumno'], 'curso': data['curso'],
            'rol': data['rol'],
        })
    except SupabaseError as exc:
        message = _supabase_message(exc, 'No se pudo crear el usuario. Inténtalo nuevamente.')
        status = 409 if 'Ya existe' in message else (exc.status if exc.status in (429, 503) else 400)
        fields = {'correo': message} if status == 409 else {}
        logger.warning('Registro rechazado por Supabase: status=%s code=%s', exc.status, exc.code)
        return _error(message, status, fields)

    user = result.get('user') or result
    # Con confirmación de correo activada, Supabase no devuelve error si el
    # correo ya existe: devuelve un usuario sin identidades.
    if not user.get('id') or user.get('identities') == []:
        msg = 'Ya existe un usuario registrado con este correo electrónico.'
        return _error(msg, 409, {'correo': msg})

    user_id = user.get('id')
    # Guardar en base de datos (usuarios y escolares)
    _save_student_to_db(user_id, data)

    needs_confirmation = not result.get('access_token')
    if not needs_confirmation:
        # Sin confirmación por correo hay sesión: verifica/crea el perfil ahora.
        try:
            _ensure_profile(result['access_token'], user)
        except SupabaseError:
            logger.exception('Usuario creado pero no se pudo verificar su perfil')

    return JsonResponse({'needsConfirmation': needs_confirmation}, status=201)


@require_POST
def login(request):
    ip = get_client_ip(request)
    if is_rate_limited(ip, 'login', limit=10, window_seconds=60):
        return _error('Demasiados intentos de inicio de sesión. Por seguridad, espera 1 minuto.', 429)

    body = _json_body(request)
    if body is None:
        return _error('Solicitud inválida.')

    email = body.get('email')
    password = body.get('password')
    if not isinstance(email, str) or not EMAIL_RE.match(email.strip()):
        return _error('Ingresa un correo electrónico válido.', 422)
    if not isinstance(password, str) or not password:
        return _error('Ingresa tu contraseña.', 422)

    if has_sql_injection(email) or has_sql_injection(password):
        return _error('Formato de credenciales no permitido.', 400)

    try:
        data = sb.sign_in(email.strip().lower(), password)
        profile = _ensure_profile(data['access_token'], data['user'])
    except SupabaseError as exc:
        message = _supabase_message(exc, 'No se pudo iniciar sesión. Inténtalo nuevamente.')
        bad_credentials = exc.code in ('invalid_credentials', 'invalid_grant') or 'invalid login' in exc.message.lower()
        status = 401 if bad_credentials else (403 if exc.code == 'email_not_confirmed' else (exc.status if exc.status in (429, 503) else 400))
        logger.warning('Login rechazado: status=%s code=%s', exc.status, exc.code)
        return _error(message, status)

    _store_session(request, data, profile)
    return JsonResponse({'user': _public_user(profile)})


@require_POST
def logout(request):
    session = request.session.get(SESSION_KEY)
    if session:
        sb.sign_out(session['access_token'])
    request.session.flush()
    return JsonResponse({})


@require_GET
def me(request):
    session = request.session.get(SESSION_KEY)
    if not session:
        return _error('No hay sesión activa.', 401)

    if session['expires_at'] - time.time() < REFRESH_MARGIN:
        try:
            data = sb.refresh_session(session['refresh_token'])
        except SupabaseError:
            request.session.flush()
            return _error('Tu sesión expiró. Inicia sesión nuevamente.', 401)
        session['access_token'] = data['access_token']
        session['refresh_token'] = data.get('refresh_token', session['refresh_token'])
        session['expires_at'] = data.get('expires_at') or int(time.time()) + int(data.get('expires_in', 3600))
        request.session[SESSION_KEY] = session  # marca la sesión como modificada

    return JsonResponse({'user': session['profile']})


# ── API de Alumnos (Escolares) ────────────────────────────────────────────────

@require_GET
def get_students(request):
    """Devuelve la lista consolidada de alumnos desde la base de datos (escolares)."""
    students = []
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT e.id, e.nombre_completo, e.grado, e.direccion_hogar,
                       e.parada_id, e.estado_actual, e.codigo_retiro, e.asiste_hoy,
                       u.nombre, u.apellido
                FROM public.escolares e
                LEFT JOIN public.usuarios u ON e.id_apoderado = u.id
                ORDER BY e.parada_id ASC, e.nombre_completo ASC;
            """)
            rows = cursor.fetchall()
            emojis = ['🧒', '👧', '👦', '🎒', '🧒', '👧']
            state_map = {
                'esperando': 'pendiente',
                'pendiente': 'pendiente',
                'subio': 'subio',
                'en_ruta': 'subio',
                'ausente': 'no_subio',
                'no_subio': 'no_subio',
                'entregado': 'entregado',
                'en_recorrido': 'en_recorrido',
                'listo_entrega': 'listo_entrega',
            }
            for idx, r in enumerate(rows):
                s_id, name, grade, address, stop_no, status, pin, asiste, apo_nom, apo_ape = r
                guardian_parts = [p for p in (apo_nom, apo_ape) if p and p != 'Sin apellido']
                guardian_name = " ".join(guardian_parts).strip()
                if not guardian_name:
                    guardian_name = 'Apoderado registrado'

                current_state = state_map.get(status, 'pendiente')
                if asiste is False:
                    current_state = 'no_subio'

                stop_index = stop_no or (idx + 1)
                eta_minutes = 10 + (stop_index * 6)
                eta_hour = 8 + (eta_minutes // 60)
                eta_min = eta_minutes % 60
                eta_str = f"{eta_hour}:{eta_min:02d} AM"

                students.append({
                    'id': str(s_id),
                    'name': name or 'Alumno sin nombre',
                    'grade': grade or 'Básico',
                    'route': 'Furgón Los Robles',
                    'emoji': emojis[idx % len(emojis)],
                    'address': address or 'Dirección del alumno',
                    'stopNumber': stop_index,
                    'eta': eta_str,
                    'state': current_state,
                    'authorizedGuardian': f"{guardian_name} (Apoderado)",
                    'pickupCode': pin or '4829',
                })
    except Exception as exc:
        logger.exception('Error al consultar lista de escolares: %s', exc)
        return JsonResponse({'success': True, 'students': []})

    return JsonResponse({'success': True, 'students': students})


@require_POST
def update_student_status(request, student_id):
    """Actualiza el estado de un alumno en la base de datos."""
    ip = get_client_ip(request)
    if is_rate_limited(ip, 'update_status', limit=60, window_seconds=60):
        return _error('Demasiadas solicitudes. Espera un momento.', 429)

    body = _json_body(request)
    if body is None:
        return _error('Solicitud inválida.')

    new_state = body.get('state')
    if not isinstance(new_state, str) or not new_state:
        return _error('Estado inválido.')

    if has_sql_injection(new_state) or has_sql_injection(str(student_id)):
        return _error('Entrada inválida.', 400)

    db_state_map = {
        'pendiente': 'esperando',
        'subio': 'subio',
        'no_subio': 'ausente',
        'en_recorrido': 'en_ruta',
        'listo_entrega': 'en_ruta',
        'entregado': 'entregado',
    }
    db_state = db_state_map.get(new_state, new_state)
    asiste = False if new_state == 'no_subio' else True

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE public.escolares
                SET estado_actual = %s, asiste_hoy = %s
                WHERE id::text = %s;
            """, [db_state, asiste, str(student_id)])
    except Exception as exc:
        logger.exception('Error al actualizar estado en BD: %s', exc)
        return _error('No se pudo actualizar en la base de datos.', 500)

    return JsonResponse({'success': True, 'studentId': student_id, 'state': new_state})

