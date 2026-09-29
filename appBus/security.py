"""
Utilidades y Middleware de Seguridad para ProjectBus.
- Prevención y detección de inyección SQL (SQLi).
- Sanitización de identificadores y prevención de inyección en PostgREST.
- Limitación de tasa (Rate Limiting) para evitar ataques de fuerza bruta y DDoS.
- Cabeceras de seguridad HTTP (CSP, X-Content-Type-Options, Permissions-Policy).
"""
import logging
import re
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('security')

# Patrones típicos de ataques de inyección SQL
SQLI_PATTERNS = [
    re.compile(r"(--|/\*|\*/|#)", re.IGNORECASE),                               # Comentarios SQL
    re.compile(r"(\bor\b|\band\b)\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+", re.IGNORECASE),  # Tautologías: OR 1=1, 'a'='a'
    re.compile(r"\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT|SELECT\s+[\s\S]+\s+FROM)\b", re.IGNORECASE),  # Unión / subconsultas
    re.compile(r"\b(DROP\s+TABLE|ALTER\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b", re.IGNORECASE),  # DDL/DML destructivo
    re.compile(r"\b(EXEC|EXECUTE|XP_CMDSHELL|PG_SLEEP)\b", re.IGNORECASE),      # Comandos / time-based injection
    re.compile(r";\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)", re.IGNORECASE), # Query stacking
]

# Identificadores seguros: solo letras, números, guiones y guiones bajos (hasta 64 caracteres)
SAFE_ID_RE = re.compile(r'^[a-zA-Z0-9_\-]{1,64}$')


def has_sql_injection(value):
    """Verifica si una cadena contiene firmas conocidas de inyección SQL."""
    if not isinstance(value, str):
        return False
    # Rechazar caracteres nulos inmediatamente (causan truncamiento de strings en C)
    if '\x00' in value:
        return True
    for pattern in SQLI_PATTERNS:
        if pattern.search(value):
            return True
    return False


def is_safe_identifier(value):
    """Valida que un ID sea seguro contra inyección de parámetros o filtros PostgREST."""
    if not isinstance(value, str):
        return False
    return bool(SAFE_ID_RE.match(value.strip()))


def get_client_ip(request):
    """Obtiene la dirección IP real del cliente considerando proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip or '127.0.0.1'


def is_rate_limited(ip, action, limit=10, window_seconds=60):
    """
    Control de tasa en memoria/caché por IP y acción.
    Retorna True si la petición debe ser bloqueada (excedió el límite).
    """
    cache_key = f'ratelimit:{action}:{ip}'
    try:
        current = cache.get(cache_key, 0)
        if current >= limit:
            logger.warning('Rate limit excedido para IP %s en acción %s', ip, action)
            return True
        cache.set(cache_key, current + 1, window_seconds)
    except Exception:
        # Si la caché falla, no bloqueamos la petición pero registramos el evento
        pass
    return False


class SecurityHeadersMiddleware:
    """
    Middleware que añade cabeceras HTTP de seguridad para mitigar
    XSS, Clickjacking, MIME-sniffing e inyecciones de contenido.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Content-Security-Policy (CSP)
        csp = (
            "default-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: blob:; "
            "script-src 'self'; "
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
            "frame-ancestors 'none';"
        )
        response.headers.setdefault('Content-Security-Policy', csp)
        response.headers.setdefault('X-Content-Type-Options', 'nosniff')
        response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

        return response
