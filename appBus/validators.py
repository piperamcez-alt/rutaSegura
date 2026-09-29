"""Validación del formulario de registro y prevención de inyecciones."""
import re
from .security import has_sql_injection

EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
ROLES = ('apoderado', 'conductor')
MAX_TEXT = 80
MAX_EMAIL = 254
MIN_PASSWORD = 8
MAX_PASSWORD = 72  # límite práctico de bcrypt, usado por Supabase


def clean_text(value):
    """Texto sin etiquetas HTML, caracteres de control ni bytes nulos, recortado."""
    if not isinstance(value, str):
        return ''
    value = re.sub(r'<[^>]*>', '', value)
    value = re.sub(r'[\x00-\x1f\x7f]', '', value)
    return value.strip()[:MAX_TEXT]


def validate_registration(payload):
    """Devuelve (datos_limpios, password, errores_por_campo)."""
    errors = {}
    payload = payload if isinstance(payload, dict) else {}

    rol = payload.get('rol') or 'apoderado'
    if rol not in ROLES:
        errors['rol'] = 'El tipo de usuario no es válido.'

    raw_nombre = str(payload.get('nombre') or '')
    raw_apellido = str(payload.get('apellido') or '')
    if has_sql_injection(raw_nombre):
        errors['nombre'] = 'Entrada inválida o caracteres no permitidos.'
    if has_sql_injection(raw_apellido):
        errors['apellido'] = 'Entrada inválida o caracteres no permitidos.'

    nombre = clean_text(raw_nombre)
    apellido = clean_text(raw_apellido)
    if not nombre and 'nombre' not in errors:
        errors['nombre'] = 'El nombre es obligatorio.'
    if not apellido and 'apellido' not in errors:
        errors['apellido'] = 'El apellido es obligatorio.'

    correo_raw = payload.get('correo')
    if isinstance(correo_raw, str) and has_sql_injection(correo_raw):
        errors['correo'] = 'Correo electrónico inválido.'

    correo = correo_raw.strip().lower()[:MAX_EMAIL] if isinstance(correo_raw, str) else ''
    if not correo and 'correo' not in errors:
        errors['correo'] = 'El correo electrónico es obligatorio.'
    elif not EMAIL_RE.match(correo) and 'correo' not in errors:
        errors['correo'] = 'Ingresa un correo electrónico válido.'

    raw_nombre_alumno = str(payload.get('nombre_alumno') or '')
    raw_curso = str(payload.get('curso') or '')
    if has_sql_injection(raw_nombre_alumno):
        errors['nombre_alumno'] = 'Entrada inválida o caracteres no permitidos.'
    if has_sql_injection(raw_curso):
        errors['curso'] = 'Entrada inválida o caracteres no permitidos.'

    nombre_alumno = clean_text(raw_nombre_alumno)
    curso = clean_text(raw_curso)
    if rol == 'apoderado':
        if not nombre_alumno and 'nombre_alumno' not in errors:
            errors['nombre_alumno'] = 'El nombre del alumno es obligatorio.'
        if not curso and 'curso' not in errors:
            errors['curso'] = 'El curso es obligatorio.'

    password = payload.get('password')
    if not isinstance(password, str) or not password:
        errors['password'] = 'La contraseña es obligatoria.'
    elif '\x00' in password:
        errors['password'] = 'La contraseña contiene caracteres no permitidos.'
    elif len(password) < MIN_PASSWORD:
        errors['password'] = f'La contraseña debe tener al menos {MIN_PASSWORD} caracteres.'
    elif len(password) > MAX_PASSWORD:
        errors['password'] = f'La contraseña no puede superar los {MAX_PASSWORD} caracteres.'
    elif not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        errors['password'] = 'Debe incluir al menos una letra y un número.'

    data = {
        'nombre': nombre, 'apellido': apellido, 'correo': correo,
        'nombre_alumno': nombre_alumno, 'curso': curso, 'rol': rol,
    }
    return data, password, errors
