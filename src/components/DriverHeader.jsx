import { useRef, useState } from 'react';
import { BellIcon, LogoutIcon } from './icons.jsx';
import NotificationsPanel from './NotificationsPanel.jsx';
import { useClickOutside } from '../hooks/useClickOutside.js';
import { getInitials } from '../utils/sanitize.js';

export default function DriverHeader({
  driverName = 'Carlos Morales',
  routeStatus = 'en_ruta',
  notifications = [],
  onLogout,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(notifications.length > 0);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  useClickOutside([bellRef, panelRef], () => setNotifOpen(false), notifOpen);

  function toggleNotifications() {
    setNotifOpen((v) => !v);
    setHasUnread(false);
  }

  const statusLabel =
    routeStatus === 'en_ruta'
      ? 'En recorrido'
      : routeStatus === 'pausado'
      ? 'En pausa'
      : 'Finalizado';

  const statusClass =
    routeStatus === 'en_ruta'
      ? 'driver-status-live'
      : routeStatus === 'pausado'
      ? 'driver-status-pause'
      : 'driver-status-done';

  return (
    <header className="header driver-header">
      {/* Información del Conductor */}
      <div className="driver-profile-info">
        <span className="avatar driver-avatar">{getInitials(driverName)}</span>
        <div className="driver-greeting">
          <div className="driver-role-row">
            <span className="driver-badge">Conductor</span>
            <span className={`driver-status-chip ${statusClass}`}>
              <span className="live-dot" />
              {statusLabel}
            </span>
          </div>
          <strong className="driver-name">{driverName}</strong>
        </div>
      </div>

      {/* Botones de Cabecera: Notificaciones y Cerrar sesión */}
      <div className="driver-header-actions">
        <button
          className="bell-btn"
          ref={bellRef}
          onClick={toggleNotifications}
          aria-label="Notificaciones del conductor"
          aria-expanded={notifOpen}
        >
          <BellIcon />
          {hasUnread && <span className="bell-dot" />}
        </button>

        <button
          className="logout-header-btn"
          onClick={onLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogoutIcon width={18} height={18} />
          <span className="logout-text">Salir</span>
        </button>

        <NotificationsPanel notifications={notifications} open={notifOpen} ref={panelRef} />
      </div>
    </header>
  );
}
