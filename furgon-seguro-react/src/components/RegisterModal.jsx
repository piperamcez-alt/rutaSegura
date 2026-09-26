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

  if (!isOpen) return null;

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
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

    if (formData.role === 'apoderado') {
      if (!formData.childName.trim()) newErrors.childName = 'El nombre del alumno es obligatorio.';
      if (!formData.grade.trim()) newErrors.grade = 'El curso es obligatorio.';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    } else if (formData.password.length < 3) {
      newErrors.password = 'La contraseña debe tener al menos 3 caracteres.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar la contraseña.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      childName: formData.childName.trim() || (formData.role === 'conductor' ? 'Alumnos a cargo' : ''),
      grade: formData.grade.trim() || (formData.role === 'conductor' ? 'Ruta General' : ''),
    };

    const res = onRegisterSuccess(payload);
    if (res && res.success) {
      setIsSuccess(true);
    } else if (res && res.error) {
      setErrors({ form: res.error });
    }
  }

  function handleResetAndClose() {
    setIsSuccess(false);
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
                      onChange={() => handleChange('role', 'apoderado')}
                    />
                    <span>👨‍👩‍👧 Apoderado</span>
                  </label>
                  <label className={`register-role-option${formData.role === 'conductor' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="role"
                      value="conductor"
                      checked={formData.role === 'conductor'}
                      onChange={() => handleChange('role', 'conductor')}
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

              {/* Alumno y Curso */}
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="reg-childName">
                    {formData.role === 'apoderado' ? 'Nombre del alumno' : 'Nombre del alumno o referencia'}
                  </label>
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
                  <label htmlFor="reg-grade">Curso</label>
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

              <button type="submit" className="register-submit-btn">
                Crear cuenta
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
