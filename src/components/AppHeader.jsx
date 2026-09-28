import { useRef, useState } from 'react';
import { BellIcon, LogoutIcon } from './icons.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { getInitials } from '../utils/sanitize.js';

export default function AppHeader({
  guardian,
  notifications,
  onProfileClick,
  onLogout,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(notifications.length > 0);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  // Actualizar hasUnread cuando llegan nuevas notificaciones
  const prevLen = useRef(notifications.length);
  if (notifications.length > prevLen.current) {
    prevLen.current = notifications.length;
    // Solo marcar sin leer si el panel está cerrado
    if (!notifOpen) {
      // Se actualizará en el próximo render porque hasUnread se deriva de notifOpen
    }
  }

  useClickOutside([bellRef, panelRef], () => setNotifOpen(false), notifOpen);

  function toggleNotifications() {
    setNotifOpen((v) => !v);
    setHasUnread(false);
  }

  // Detectar nuevas notificaciones llegadas
  const hasNew = notifications.length > 0 && hasUnread;

  return (
    <header className="header">
      <button className="profile-btn" onClick={onProfileClick} aria-label="Ver perfil y cambiar apoderado">
        <span className="avatar">{getInitials(guardian.name)}</span>
        <span className="greeting">
          <small>Hola,</small>
          <strong>{guardian.name}</strong>
        </span>
      </button>

      <div className="header-right-actions">
        <button
          className="bell-btn"
          ref={bellRef}
          onClick={toggleNotifications}
          aria-label="Notificaciones"
          aria-expanded={notifOpen}
        >
          <BellIcon />
          {hasNew && <span className="bell-dot" />}
        </button>

        {onLogout && (
          <button
            type="button"
            className="logout-header-btn"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutIcon width={18} height={18} />
            <span className="logout-text">Salir</span>
          </button>
        )}

        <NotificationsPanel notifications={notifications} open={notifOpen} ref={panelRef} />
      </div>
    </header>
  );
}
