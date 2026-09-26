import { forwardRef } from 'react';

const NotificationsPanel = forwardRef(function NotificationsPanel({ notifications, open }, ref) {
  return (
    <div
      className={`panel${open ? ' open' : ''}`}
      ref={ref}
      role="dialog"
      aria-label="Notificaciones"
      aria-hidden={!open}
    >
      <div className="panel-title">Notificaciones</div>
      {notifications.map((n) => (
        <div className="notif-item" key={n.id}>
          <span className={`notif-dot ${n.tone}`} />
          <div>
            <strong>{n.title}</strong>
            <small>{n.time}</small>
          </div>
        </div>
      ))}
    </div>
  );
});

export default NotificationsPanel;
