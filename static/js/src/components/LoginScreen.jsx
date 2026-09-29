import { useState } from 'react';
import { VanIcon, ShieldIcon } from './icons.jsx';

export default function LoginScreen({ onLogin, onOpenRegister, onQuickLogin }) {
  const [role, setRole] = useState('apoderado'); // 'apoderado' | 'conductor'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleRoleChange(selectedRole) {
    setRole(selectedRole);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña.');
      return;
    }

    setLoading(true);
    const res = await onLogin(email, password, role);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Credenciales inválidas. Revisa tus datos.');
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Logo e Identidad */}
        <header className="login-header">
          <div className="login-badge-icon">
            <VanIcon width={36} height={36} />
          </div>
          <h1 className="login-brand-title">Furgón Seguro</h1>
          <span className="login-badge-subtitle">Transporte Escolar Protegido</span>
          <h2 className="login-welcome-title">Bienvenido</h2>
          <p className="login-desc">Ingresa a tu cuenta para coordinar el viaje seguro de los estudiantes</p>
        </header>

        {/* Selector de Tipo de Usuario */}
        <div className="login-role-selector" role="group" aria-label="Seleccionar tipo de usuario">
          <button
            type="button"
            className={`role-tab-btn${role === 'apoderado' ? ' active' : ''}`}
            onClick={() => handleRoleChange('apoderado')}
          >
            <span className="role-icon">👨‍👩‍👧</span>
            <span className="role-btn-text">
              <strong>Apoderado</strong>
              <small>Seguimiento en vivo</small>
            </span>
          </button>
          <button
            type="button"
            className={`role-tab-btn${role === 'conductor' ? ' active' : ''}`}
            onClick={() => handleRoleChange('conductor')}
          >
            <span className="role-icon">🚐</span>
            <span className="role-btn-text">
              <strong>Conductor</strong>
              <small>Ruta y entregas</small>
            </span>
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="login-error-box" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="input-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              placeholder="nombre@ejemplo.cl"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? 'Ingresando…'
              : `Iniciar sesión como ${role === 'apoderado' ? 'Apoderado' : 'Conductor'}`}
          </button>
        </form>

        {/* Enlace para Crear Usuario */}
        <div className="login-footer-links">
          <p className="no-account-text">¿No tienes una cuenta?</p>
          <button
            type="button"
            className="register-link-btn"
            onClick={onOpenRegister}
          >
            Crear usuario
          </button>
        </div>


        <div className="login-security-notice">
          <ShieldIcon width={14} height={14} />
          <span>Entrega protegida con clave dinámica de 4 dígitos</span>
        </div>
      </div>
    </div>
  );
}
