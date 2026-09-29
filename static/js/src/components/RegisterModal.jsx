import { useState } from 'react';
import { CrossIcon } from './icons.jsx';

export default function RegisterModal({ isOpen, onClose, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    childName: '',
    grade: '',
    password: '',
    confirmPassword: '',
    role: 'apoderado', // 'apoderado' | 'conductor'
  });

  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }

  function handleRoleChange(newRole) {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      childName: newRole === 'conductor' ? '' : prev.childName,
      grade: newRole === 'conductor' ? '' : prev.grade,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      if (newRole === 'conductor') {
        delete next.childName;
        delete next.grade;
      }
      return next;
    });
  }

  function validate() {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es obligatorio.';

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un correo electrónico válido.';
    }

    // Solo se exigen alumno y curso si es apoderado
    if (formData.role === 'apoderado') {
      if (!formData.childName.trim()) newErrors.childName = 'El nombre del alumno es obligatorio.';
      if (!formData.grade.trim()) newErrors.grade = 'El curso del alumno es obligatorio.';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/[A-Za-z]/.test(formData.password) || !/\d/.test(formData.password)) {
      newErrors.password = 'Debe incluir al menos una letra y un número.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar la contraseña.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting || !validate()) return;

    const payload = {
      ...formData,
      childName: formData.role === 'conductor' ? '' : formData.childName.trim(),
      grade: formData.role === 'conductor' ? '' : formData.grade.trim(),
    };

    setSubmitting(true);
    const res = await onRegisterSuccess(payload);
    setSubmitting(false);

    if (res && res.success) {
      setNeedsConfirmation(Boolean(res.needsConfirmation));
      setIsSuccess(true);
    } else {
      // Errores por campo devueltos por el servidor (correo duplicado, etc.)
      const fieldMap = {
        nombre: 'name', apellido: 'lastName', correo: 'email',
        nombre_alumno: 'childName', curso: 'grade', password: 'password',
      };
      const next = {};
      Object.entries(res?.fieldErrors || {}).forEach(([k, msg]) => {
        if (fieldMap[k]) next[fieldMap[k]] = msg;
      });
      if (!Object.keys(next).length) {
        next.form = res?.error || 'No se pudo crear el usuario. Inténtalo nuevamente.';
      }
      setErrors(next);
    }
  }

  function handleResetAndClose() {
    setIsSuccess(false);
    setNeedsConfirmation(false);
    setFormData({
      name: '',
      lastName: '',
      email: '',
      childName: '',
      grade: '',
      password: '',
      confirmPassword: '',
      role: 'apoderado',
    });
    setErrors({});
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => {
      if (e.target === e.currentTarget) handleResetAndClose();
    }}>
      <div className="modal-content register-modal" role="dialog" aria-labelledby="register-modal-title">
        <button className="modal-close-btn" onClick={handleResetAndClose} aria-label="Cerrar modal">
          <CrossIcon />
        </button>

        {isSuccess ? (
          <div className="register-success-view">
            <div className="success-badge-icon">🎉</div>
            <h2 id="register-modal-title">¡Usuario creado correctamente!</h2>
            <p className="success-message">
              Tu cuenta de <strong>{formData.role === 'apoderado' ? 'Apoderado' : 'Conductor'}</strong> ha sido registrada con éxito para <strong>{formData.name} {formData.lastName}</strong>.
            </p>
            <div className="success-details-card">
              <div><span>Correo:</span> <strong>{formData.email}</strong></div>
              <div><span>Perfil:</span> <strong>{formData.role === 'apoderado' ? 'Apoderado' : 'Conductor'}</strong></div>
              {formData.role === 'apoderado' && (
                <div><span>Alumno:</span> <strong>{formData.childName} ({formData.grade})</strong></div>
              )}
            </div>
            {needsConfirmation && (
              <p className="success-message">
                Te enviamos un correo de confirmación. Confirma tu cuenta antes de iniciar sesión.
              </p>
            )}
            <button
              type="button"
              className="register-submit-btn"
              onClick={handleResetAndClose}
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <div className="register-header">
              <span className="register-pill">Registro de cuenta</span>
              <h2 id="register-modal-title">Crear nuevo usuario</h2>
              <p className="register-subtitle">Completa los datos para integrarte a la red de transporte escolar</p>
            </div>

            {errors.form && (
              <div className="login-error-box" style={{ marginBottom: 16 }}>
                <span>⚠️ {errors.form}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form" noValidate>
              {/* Tipo de Usuario */}
              <div className="input-group">
                <label>Tipo de usuario</label>
                <div className="register-role-options">
                  <label className={`register-role-option${formData.role === 'apoderado' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="apoderado"
                      checked={formData.role === 'apoderado'}
                      onChange={() => handleRoleChange('apoderado')}
                    />
                    <span>👨‍👩‍👧 Apoderado</span>
                  </label>
                  <label className={`register-role-option${formData.role === 'conductor' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="conductor"
                      checked={formData.role === 'conductor'}
                      onChange={() => handleRoleChange('conductor')}
                    />
                    <span>🚐 Conductor</span>
                  </label>
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="reg-name">Nombre</label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="Ej. Camila"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={errors.name ? 'input-error' : ''}
                  />
                  {errors.name && <small className="error-text">{errors.name}</small>}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-lastName">Apellido</label>
                  <input
                    id="reg-lastName"
                    type="text"
                    placeholder="Ej. Soto"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className={errors.lastName ? 'input-error' : ''}
                  />
                  {errors.lastName && <small className="error-text">{errors.lastName}</small>}
                </div>
              </div>

              {/* Correo Electrónico */}
              <div className="input-group">
                <label htmlFor="reg-email">Correo electrónico</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="nombre@ejemplo.cl"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'input-error' : ''}
                />
                {errors.email && <small className="error-text">{errors.email}</small>}
              </div>

              {/* Alumno y Curso (solo visible para apoderados) */}
              {formData.role === 'apoderado' && (
                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="reg-childName">Nombre del alumno</label>
                    <input
                      id="reg-childName"
                      type="text"
                      placeholder="Ej. Lucas Soto"
                      value={formData.childName}
                      onChange={(e) => handleChange('childName', e.target.value)}
                      className={errors.childName ? 'input-error' : ''}
                    />
                    {errors.childName && <small className="error-text">{errors.childName}</small>}
                  </div>
                  <div className="input-group">
                    <label htmlFor="reg-grade">Curso del alumno</label>
                    <input
                      id="reg-grade"
                      type="text"
                      placeholder="Ej. 3° Básico"
                      value={formData.grade}
                      onChange={(e) => handleChange('grade', e.target.value)}
                      className={errors.grade ? 'input-error' : ''}
                    />
                    {errors.grade && <small className="error-text">{errors.grade}</small>}
                  </div>
                </div>
              )}

              {/* Contraseñas */}
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="reg-password">Contraseña</label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={errors.password ? 'input-error' : ''}
                  />
                  {errors.password && <small className="error-text">{errors.password}</small>}
                </div>
                <div className="input-group">
                  <label htmlFor="reg-confirmPassword">Confirmar contraseña</label>
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className={errors.confirmPassword ? 'input-error' : ''}
                  />
                  {errors.confirmPassword && <small className="error-text">{errors.confirmPassword}</small>}
                </div>
              </div>

              <button type="submit" className="register-submit-btn" disabled={submitting}>
                {submitting ? 'Creando usuario…' : 'Crear usuario'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
