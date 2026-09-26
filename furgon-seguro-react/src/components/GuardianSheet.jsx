import { useRef, useState, useEffect } from 'react';
import { GuardianIcon, ChevronIcon } from './icons.jsx';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { getInitials, isKnownId } from '../utils/sanitize.js';

// Duración del código: 10 minutos (tiempo suficiente para la recogida)
const CODE_EXPIRY_SECONDS = 600;

export default function GuardianSheet({
  guardians,
  selectedId,
  open,
  onOpen,
  onClose,
  onSelect,
  // Pickup code props
  pickupCode,
  pickupCodeTime,
  onGenerateCode,
  onClearCode,
}) {
  const sheetRef = useRef(null);
  const selected = guardians.find((g) => g.id === selectedId) ?? guardians[0];
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);

  useClickOutside(sheetRef, onClose, open);

  // Al seleccionar un apoderado, se actualiza y se genera automáticamente el código único de 4 dígitos
  function handleSelect(id) {
    if (isKnownId(id, guardians)) {
      onSelect(id);
      onGenerateCode?.();
    }
  }

  // Contador de expiración del código
  useEffect(() => {
    if (!pickupCode || !pickupCodeTime) return;

    function calcRemaining() {
      const elapsed = Math.floor((Date.now() - pickupCodeTime.getTime()) / 1000);
      return Math.max(0, CODE_EXPIRY_SECONDS - elapsed);
    }

    const timer = setTimeout(() => {
      setCountdown(calcRemaining());
    }, 0);

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClearCode?.();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [pickupCode, pickupCodeTime, onClearCode]);

  function handleCopyCode() {
    if (!pickupCode) return;
    navigator.clipboard.writeText(pickupCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentCountdown = (!pickupCode || !pickupCodeTime) ? null : countdown;
  const countdownPct = currentCountdown != null ? Math.round((currentCountdown / CODE_EXPIRY_SECONDS) * 100) : 100;
  const minutesLeft = currentCountdown ? Math.floor(currentCountdown / 60) : 0;
  const secondsLeft = currentCountdown ? currentCountdown % 60 : 0;
  const timeFormatted = `${minutesLeft}:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

  return (
    <>
      <button className="mini-card" onClick={onOpen} aria-haspopup="dialog" aria-expanded={open}>
        <span className="mini-icon guardian-icon">
          <GuardianIcon />
        </span>
        <span className="mini-text">
          <strong>Cambiar apoderado</strong>
          <small>{selected.name} recibe hoy</small>
        </span>
        {pickupCode ? (
          <span className="pickup-mini-badge" title="Código de entrega al chofer">
            PIN: {pickupCode}
          </span>
        ) : (
          <ChevronIcon />
        )}
      </button>

      <div
        className={`sheet-backdrop${open ? ' open' : ''}`}
        aria-hidden={!open}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="sheet" ref={sheetRef} role="dialog" aria-label="Elegir apoderado de hoy">
          <div className="sheet-handle" />
          <h2>Elegir apoderado de hoy</h2>
          <p className="sheet-sub">Al seleccionar se genera un código de 4 dígitos para cuando el niño sea recogido por el chofer</p>

          <div className="guardian-list">
            {guardians.map((g) => (
              <button
                key={g.id}
                className={`guardian-option${g.id === selectedId ? ' selected' : ''}`}
                onClick={() => handleSelect(g.id)}
              >
                <span className="avatar small">{getInitials(g.name)}</span>
                <span>
                  <strong>{g.name}</strong>
                  <small>{g.role}</small>
                </span>
                <span className="check">✓</span>
              </button>
            ))}
          </div>

          {/* ── Sección de código de seguridad de 4 dígitos ── */}
          <div className="pickup-section">
            {!pickupCode ? (
              <div className="pickup-cta-box">
                <p className="pickup-hint">
                  Selecciona un apoderado arriba o presiona aquí para generar el código único de recogida:
                </p>
                <button className="pickup-btn" onClick={onGenerateCode}>
                  <span className="pickup-btn-icon">🔑</span>
                  Generar código de recogida
                </button>
              </div>
            ) : (
              <div className="pickup-code-card">
                <p className="pickup-code-label">Código único de recogida (4 dígitos)</p>
                <div className="pickup-code-digits" aria-live="assertive">
                  {pickupCode.split('').map((digit, i) => (
                    <span key={i} className="pickup-digit">{digit}</span>
                  ))}
                </div>
                <p className="pickup-code-sub">
                  El chofer solicitará este código al recoger al niño para validar la entrega segura con <strong>{selected.name}</strong>
                </p>

                {/* Barra de expiración */}
                <div className="pickup-countdown-track">
                  <div
                    className={`pickup-countdown-fill${currentCountdown != null && currentCountdown < 60 ? ' urgent' : ''}`}
                    style={{ width: `${countdownPct}%` }}
                  />
                </div>
                <p className="pickup-countdown-text">
                  {currentCountdown != null && currentCountdown > 0
                    ? `Válido por ${timeFormatted}`
                    : 'Código expirado'}
                </p>

                <div className="pickup-actions">
                  <button className="pickup-action-btn secondary" onClick={handleCopyCode}>
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                  <button className="pickup-action-btn secondary" onClick={onGenerateCode} title="Generar nuevo código">
                    🔄 Nuevo PIN
                  </button>
                  <button className="pickup-action-btn danger" onClick={onClearCode}>
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="sheet-close" onClick={onClose}>Listo</button>
        </div>
      </div>
    </>
  );
}
