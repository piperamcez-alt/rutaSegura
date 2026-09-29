"""
Django settings for busSeguro project.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga las variables de entorno desde el archivo .env (ver .env.example).
# En Railway, las variables se inyectan directamente; load_dotenv es un no-op seguro.
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in ('1', 'true', 'yes', 'on')


# ── Seguridad ─────────────────────────────────────────────────────────────────

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-8@=8$#=g6t79qxdn+a-la$pew%9%72vav$@^&p7l3l$yahj(y0',  # solo desarrollo
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool('DJANGO_DEBUG', False)

# ── ALLOWED_HOSTS ─────────────────────────────────────────────────────────────
# En Railway las variables de entorno de dominio que puede tener el contenedor son:
#   RAILWAY_PUBLIC_DOMAIN   → dominio público asignado por Railway (*.up.railway.app)
#   RAILWAY_PRIVATE_DOMAIN  → dominio interno entre servicios
# También se acepta cualquier valor explícito en DJANGO_ALLOWED_HOSTS.

ALLOWED_HOSTS = [h.strip() for h in os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()]

for _var in ('RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PRIVATE_DOMAIN', 'RAILWAY_STATIC_URL'):
    _host = os.getenv(_var, '').strip()
    if _host and _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)

# Fallback seguro para Railway hasta que se configure el dominio definitivo
if not ALLOWED_HOSTS and not DEBUG:
    ALLOWED_HOSTS = ['*']

# ── CSRF Trusted Origins (necesario cuando hay proxy inverso en Railway) ──────
CSRF_TRUSTED_ORIGINS = []
_public_domain = os.getenv('RAILWAY_PUBLIC_DOMAIN', '').strip()
if _public_domain:
    CSRF_TRUSTED_ORIGINS.append(f'https://{_public_domain}')
_extra_origins = os.getenv('CSRF_TRUSTED_ORIGINS', '').strip()
if _extra_origins:
    CSRF_TRUSTED_ORIGINS.extend([o.strip() for o in _extra_origins.split(',') if o.strip()])


# ── Application definition ────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'appBus',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # sirve estáticos en producción
    'appBus.security.SecurityHeadersMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'busSeguro.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'busSeguro.wsgi.application'


# ── Database ──────────────────────────────────────────────────────────────────
# Prioridad: DATABASE_URL (Railway Postgres plugin) → DB_HOST explícito → SQLite

db_url = os.getenv('DATABASE_URL', '').strip()
db_host = os.getenv('DB_HOST', '').strip()

if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif db_url:
    # Cuando Railway provee DATABASE_URL (plugin Postgres nativo)
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=db_url,
            conn_max_age=600,
            ssl_require=True,
        )
    }
elif db_host and 'TU_PROJECT_REF' not in db_host:
    # Supabase Postgres vía variables individuales
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     os.getenv('DB_NAME',     'postgres'),
            'USER':     os.getenv('DB_USER',     'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST':     db_host,
            'PORT':     os.getenv('DB_PORT',     '5432'),
            'OPTIONS': {
                'sslmode': os.getenv('DB_SSLMODE', 'require'),
            },
            'CONN_MAX_AGE': 600,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# ── Password validation ───────────────────────────────────────────────────────

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ── Internationalización ──────────────────────────────────────────────────────

LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True


# ── Static files ──────────────────────────────────────────────────────────────

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise: comprime y cachea los archivos estáticos en producción
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ── Email ─────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# ── Supabase ──────────────────────────────────────────────────────────────────
# Las credenciales NUNCA se escriben en el código ni en las plantillas HTML:
# se leen de variables de entorno (archivo .env local o panel del hosting).

SUPABASE_URL = os.getenv('SUPABASE_URL', '').strip().rstrip('/')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '').strip()  # clave anon / publishable


# ── Sesión y cookies ──────────────────────────────────────────────────────────

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7  # 7 días
CSRF_COOKIE_HTTPONLY = False  # accesible para que React lea el token y lo envíe en X-CSRFToken
CSRF_COOKIE_SAMESITE = 'Lax'

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# ── Seguridad HTTP ────────────────────────────────────────────────────────────

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
DATA_UPLOAD_MAX_MEMORY_SIZE = 524288  # 512 KB máx. para peticiones POST/JSON
DATA_UPLOAD_MAX_NUMBER_FIELDS = 50

# En producción Railway termina SSL en el load balancer; activar HSTS
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31536000          # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


# ── Logging ───────────────────────────────────────────────────────────────────

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'WARNING'),
            'propagate': False,
        },
        'appBus': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# ── Default primary key field type ───────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Silenciar checks que no aplican en Railway ────────────────────────────────
# W008: SECURE_SSL_REDIRECT no se usa porque Railway termina SSL en su proxy
# (activarlo causaría redirect loops en producción).
SILENCED_SYSTEM_CHECKS = ['security.W008']
