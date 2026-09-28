import { useState, useEffect } from 'react';
import { CrossIcon, ShieldIcon, UserCheckIcon } from './icons.jsx';

export default function DeliveryModal({
  isOpen,
  onClose,
  students = [],
  selectedStudentId = null,
  onConfirmDelivery,
  activePickupCode = '4829',
}) {
  const [targetStudentId, setTargetStudentId] = useState(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [verificationResult, setVerificationResult] = useState(null); // null | 'success' | 'error'
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);

  // Inicializar alumno seleccionado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const initialId = selectedStudentId || (students.length > 0 ? students[0].id : null);
      setTargetStudentId(initialId);
      setPinDigits(['', '', '', '']);
      setVerificationResult(null);
      setDeliveryConfirmed(false);
    }
  }, [isOpen, selectedStudentId, students]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === targetStudentId) || students[0];

  // Manejo de teclado en pantalla
  function handleKeyPress(num) {
    if (verificationResult === 'success' || deliveryConfirmed) return;

    setPinDigits((prev) => {
      const next = [...prev];
      const emptyIndex = next.findIndex((d) => d === '');
      if (emptyIndex !== -1) {
        next[emptyIndex] = String(num);
      }
      return next;
    });

    if (verificationResult === 'error') {
      setVerificationResult(null);
    }
  }

  function handleBackspace() {
    if (verificationResult === 'success' || deliveryConfirmed) return;

    setPinDigits((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== '') {
          next[i] = '';
          break;
        }
      }
      return next;
    });
    setVerificationResult(null);
  }

  function handleClearPin() {
    setPinDigits(['', '', '', '']);
    setVerificationResult(null);
  }

  const enteredCode = pinDigits.join('');

  // Validar código
  function handleValidateCode() {
    if (enteredCode.length < 4) return;

    // Código esperado: si es Martín Reyes (c1 o isPrimaryChild), tomamos activePickupCode o student.pickupCode
    const expected = (currentStudent?.id === 'c1' || currentStudent?.isPrimaryChild)
      ? (activePickupCode || currentStudent?.pickupCode || '4829')
      : (currentStudent?.pickupCode || '1234');

    if (enteredCode === expected) {
      setVerificationResult('success');
    } else {
      setVerificationResult('error');
    }
  }

  function handleConfirm() {
    if (verificationResult === 'success' && currentStudent) {
      onConfirmDelivery(currentStudent.id, enteredCode);
      setDeliveryConfirmed(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  }

  function handleResetTryAgain() {
    setPinDigits(['', '', '', '']);
    setVerificationResult(null);
  }

  return (
    <div className="modal-backdrop" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content delivery-modal" role="dialog" aria-labelledby="delivery-modal-title">
        <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
          <CrossIcon />
        </button>

        {deliveryConfirmed ? (
          <div className="delivery-success-view">
            <div className="success-badge-icon">✅</div>
            <h2>¡Entrega completada!</h2>
            <p className="success-message">
              <strong>{currentStudent?.name}</strong> fue entregado con éxito a <strong>{currentStudent?.authorizedGuardian}</strong>.
            </p>
            <span className="state-pill state-entregado">Estado: ⚪ Entregado</span>
          </div>
        ) : (
          <>
            <div className="delivery-modal-header">
              <div className="delivery-icon-badge">
                <ShieldIcon width={24} height={24} />
              </div>
              <h2 id="delivery-modal-title">Entregar niño</h2>
              <p className="delivery-modal-sub">Validación de seguridad de entrega escolar</p>
            </div>

            {/* Paso 1: Elegir al Alumno */}
            <div className="delivery-student-picker">
              <label htmlFor="delivery-student-select">Alumno que será entregado:</label>
              <select
                id="delivery-student-select"
                value={targetStudentId || ''}
                onChange={(e) => {
                  setTargetStudentId(e.target.value);
                  handleResetTryAgain();
                }}
                disabled={verificationResult === 'success'}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji || '🧒'} {s.name} · {s.grade} ({s.state === 'entregado' ? 'Ya entregado' : s.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Tarjeta del Alumno Seleccionado */}
            {currentStudent && (
              <div className="delivery-target-card">
                <div className="target-card-avatar">{currentStudent.emoji || '🧒'}</div>
                <div className="target-card-details">
                  <strong>{currentStudent.name}</strong>
                  <span>{currentStudent.grade} · {currentStudent.address}</span>
                  <small className="authorized-pill">
                    <UserCheckIcon width={13} height={13} />
                    Autorizado: <strong>{currentStudent.authorizedGuardian || 'Apoderado Titular'}</strong>
                  </small>
                </div>
              </div>
            )}

            {/* Paso 2: Ingresar la clave de entrega de 4 dígitos */}
            <div className="delivery-code-section">
              <p className="code-instruction-title">
                <strong>Ingrese la clave de entrega de 4 dígitos</strong>
              </p>
              <p className="code-instruction-sub">
                Solicite el código al apoderado o tutor que recibe al alumno
              </p>

              {/* Casillas de los 4 dígitos */}
              <div className={`pin-display-row${verificationResult === 'error' ? ' pin-error-shake' : ''}`}>
                {pinDigits.map((digit, index) => (
                  <div
                    key={index}
                    className={`pin-box${digit ? ' filled' : ''}${verificationResult === 'success' ? ' verified' : ''}${verificationResult === 'error' ? ' error' : ''}`}
                  >
                    {digit || '•'}
                  </div>
                ))}
              </div>

              {/* Mensajes de Resultado */}
              {verificationResult === 'success' && (
                <div className="verification-card verified">
                  <div className="verification-status-icon">✓</div>
                  <div className="verification-text">
                    <strong>Código verificado correctamente</strong>
                    <p>
                      Alumno: <strong>{currentStudent?.name}</strong>
                    </p>
                    <p>
                      Persona autorizada: <strong>{currentStudent?.authorizedGuardian}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="confirm-delivery-btn"
                    onClick={handleConfirm}
                  >
                    Confirmar entrega
                  </button>
                </div>
              )}

              {verificationResult === 'error' && (
                <div className="verification-card error">
                  <div className="verification-status-icon">✕</div>
                  <div className="verification-text">
                    <strong>Código incorrecto</strong>
                    <p>No coincide con la clave generada por el apoderado. No se permite la entrega.</p>
                  </div>
                  <button
                    type="button"
                    className="retry-btn"
                    onClick={handleResetTryAgain}
                  >
                    Intentar nuevamente
                  </button>
                </div>
              )}

              {/* Teclado Numérico si aún no está verificado */}
              {verificationResult !== 'success' && (
                <>
                  <div className="keypad-grid" role="group" aria-label="Teclado numérico">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className="keypad-btn"
                        onClick={() => handleKeyPress(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="keypad-btn secondary"
                      onClick={handleClearPin}
                      title="Borrar todo"
                    >
                      C
                    </button>
                    <button
                      type="button"
                      className="keypad-btn"
                      onClick={() => handleKeyPress(0)}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      className="keypad-btn secondary"
                      onClick={handleBackspace}
                      title="Borrar último dígito"
                    >
                      ⌫
                    </button>
                  </div>

                  <button
                    type="button"
                    className="validate-pin-btn"
                    disabled={enteredCode.length < 4}
                    onClick={handleValidateCode}
                  >
                    Validar código ({enteredCode.length}/4)
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
