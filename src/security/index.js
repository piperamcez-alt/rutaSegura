
const APP_NAMESPACE   = 'fs';
const MAX_TEXT_LEN    = 200;
const MAX_EMAIL_LEN   = 254; // RFC 5321
const PIN_DIGITS      = 4;
const SALT_ROUNDS     = 10000;
const MAX_LOGIN_TRIES = 5;
const LOCKOUT_MS      = 15 * 60 * 1000; // 15 minutos

/* ═══════════════════════════════════════════════
   1. SANITIZACIÓN DE INPUTS
   ═══════════════════════════════════════════════ */

/**
 * Elimina etiquetas HTML, caracteres peligrosos y trunca al largo máximo.
 * @param {string} value
 * @param {number} [maxLen=MAX_TEXT_LEN]
 */
export function sanitizeText(value, maxLen = MAX_TEXT_LEN) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')               // strip HTML tags
    .replace(/[<>"'`]/g, '')               // strip XSS chars
    .replace(/[\u0000-\u001F\u007F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLen);
}

/**
 * Valida y sanitiza un correo electrónico.
 * Retorna { value: string, valid: boolean, error?: string }
 */
export function sanitizeEmail(value) {
  if (typeof value !== 'string') return { value: '', valid: false, error: 'Correo inválido' };
  const clean = value.trim().toLowerCase().slice(0, MAX_EMAIL_LEN);
  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!EMAIL_RE.test(clean)) return { value: clean, valid: false, error: 'Formato de correo inválido' };
  return { value: clean, valid: true };
}

/**
 * Valida y sanitiza un PIN numérico.
 */
export function sanitizePIN(value) {
  const str = String(value ?? '').replace(/\D/g, '').slice(0, PIN_DIGITS);
  return { value: str, valid: str.length === PIN_DIGITS };
}

/**
 * Construye iniciales seguras desde un nombre (máx 2 caracteres).
 */
export function getInitials(name) {
  return sanitizeText(name, 80)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/* ═══════════════════════════════════════════════
   2. HASHING DE CONTRASEÑAS (PBKDF2 via WebCrypto)
   ═══════════════════════════════════════════════ */

/**
 * Genera un salt aleatorio de 16 bytes en hex.
 */
function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deriva un hash PBKDF2-SHA256 de la contraseña.
 * @returns {Promise<string>}  "salt:hash" en hex
 */
export async function hashPassword(password) {
  const salt = generateSalt();
  const enc  = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: SALT_ROUNDS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${salt}:${hash}`;
}

/**
 * Verifica una contraseña contra el hash almacenado.
 * Soporta también contraseñas planas de datos de demostración (legacy).
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // Legacy demo passwords stored in plain text (migradas al primer login)
  if (!storedHash.includes(':')) return password === storedHash;

  const [salt, expectedHash] = storedHash.split(':');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: SALT_ROUNDS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  // Comparación en tiempo constante para prevenir timing attacks
  return timingSafeEqual(hash, expectedHash);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ═══════════════════════════════════════════════
   3. RATE LIMITING DE LOGIN
   ═══════════════════════════════════════════════ */

const _loginAttempts = new Map(); // email → { count, lockUntil }

export const rateLimit = {
  /**
   * Registra un intento fallido y retorna si está bloqueado.
   * @returns {{ blocked: boolean, remaining: number, unlocksAt?: Date }}
   */
  recordFail(email) {
    const key = sanitizeEmail(email).value || 'anon';
    const now = Date.now();
    const entry = _loginAttempts.get(key) ?? { count: 0, lockUntil: 0 };

    if (entry.lockUntil > now) {
      return { blocked: true, remaining: 0, unlocksAt: new Date(entry.lockUntil) };
    }

    const count = entry.count + 1;
    const lockUntil = count >= MAX_LOGIN_TRIES ? now + LOCKOUT_MS : 0;
    _loginAttempts.set(key, { count, lockUntil });

    if (lockUntil) {
      auditLog.write('SECURITY', `Login bloqueado para ${key} por ${MAX_LOGIN_TRIES} intentos fallidos`);
    }

    return {
      blocked: !!lockUntil,
      remaining: Math.max(0, MAX_LOGIN_TRIES - count),
      unlocksAt: lockUntil ? new Date(lockUntil) : undefined,
    };
  },

  /** Limpia el contador tras un login exitoso. */
  recordSuccess(email) {
    const key = sanitizeEmail(email).value || 'anon';
    _loginAttempts.delete(key);
  },

  /** Verifica si está bloqueado sin sumar intentos. */
  isBlocked(email) {
    const key = sanitizeEmail(email).value || 'anon';
    const entry = _loginAttempts.get(key);
    if (!entry) return false;
    if (entry.lockUntil > Date.now()) return true;
    _loginAttempts.delete(key); // expirado, limpiar
    return false;
  },
};

/* ═══════════════════════════════════════════════
   4. TOKEN CSRF DE SESIÓN
   ═══════════════════════════════════════════════ */

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
}

export const csrfToken = (() => {
  let token = sessionStorage.getItem('_fs_csrf') ?? generateToken();
  sessionStorage.setItem('_fs_csrf', token);
  return {
    get: () => token,
    rotate() {
      token = generateToken();
      sessionStorage.setItem('_fs_csrf', token);
      return token;
    },
    verify: (t) => timingSafeEqual(String(t), token),
  };
})();

/* ═══════════════════════════════════════════════
   5. STORAGE SEGURO (localStorage wrapper)
   ═══════════════════════════════════════════════ */

const STORAGE_PREFIX = `${APP_NAMESPACE}:`;

export const safeStorage = {
  /** Lee un valor de localStorage. Retorna null si falla. */
  get(key) {
    try { return localStorage.getItem(`${STORAGE_PREFIX}${key}`); } catch { return null; }
  },

  /** Escribe un string en localStorage. Retorna false si falla. */
  set(key, value) {
    try {
      if (typeof value !== 'string') value = JSON.stringify(value);
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
      return true;
    } catch { return false; }
  },

  /** Elimina una clave. */
  remove(key) {
    try { localStorage.removeItem(`${STORAGE_PREFIX}${key}`); } catch { /* noop */ }
  },

  /** Elimina todas las claves del namespace de esta app. */
  clear() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
  },

  /** Lee y parsea JSON de manera segura. Retorna null si falla. */
  getJSON(key) {
    const raw = this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
};

/* ═══════════════════════════════════════════════
   6. REGISTRO DE AUDITORÍA
   ═══════════════════════════════════════════════ */

const MAX_AUDIT_EVENTS = 100;

export const auditLog = {
  /**
   * Escribe un evento de auditoría en sessionStorage (no persiste entre sesiones).
   * @param {'AUTH'|'ACTION'|'SECURITY'|'ERROR'} category
   * @param {string} message
   * @param {object} [meta]
   */
  write(category, message, meta = {}) {
    try {
      const events = JSON.parse(sessionStorage.getItem('_fs_audit') ?? '[]');
      const entry = {
        ts: new Date().toISOString(),
        cat: category,
        msg: sanitizeText(message, 300),
        ...meta,
      };
      events.unshift(entry);
      sessionStorage.setItem('_fs_audit', JSON.stringify(events.slice(0, MAX_AUDIT_EVENTS)));
      if (import.meta.env.DEV) console.debug(`[AuditLog][${category}]`, message, meta);
    } catch { /* noop */ }
  },

  /** Retorna todos los eventos de auditoría de la sesión actual. */
  read() {
    try { return JSON.parse(sessionStorage.getItem('_fs_audit') ?? '[]'); } catch { return []; }
  },

  /** Limpia el log de auditoría. */
  clear() {
    try { sessionStorage.removeItem('_fs_audit'); } catch { /* noop */ }
  },
};

/* ═══════════════════════════════════════════════
   7. VALIDADORES DE FORMULARIOS
   ═══════════════════════════════════════════════ */

export const validators = {
  name: (v) => {
    const s = sanitizeText(v, 60);
    if (!s || s.length < 2) return { valid: false, error: 'Nombre muy corto (mínimo 2 caracteres)' };
    return { valid: true, value: s };
  },
  email: (v) => sanitizeEmail(v),
  password: (v) => {
    const s = String(v ?? '').trim();
    if (s.length < 3) return { valid: false, error: 'La contraseña debe tener al menos 3 caracteres' };
    return { valid: true, value: s };
  },
  pin: (v) => sanitizePIN(v),
  grade: (v) => {
    const s = sanitizeText(v, 30);
    if (!s) return { valid: false, error: 'Indica el curso del alumno' };
    return { valid: true, value: s };
  },
};
