import RouteImage from './RouteImage.jsx';

export default function RouteCard({
  attending,
  statusText,
  statusChip,
  progressPct,
  etaLabel,
  routeImageSrc,
}) {
  return (
    <section className="hero-card" style={{ opacity: attending ? 1 : 0.55 }} aria-live="polite">
      <div className="hero-top">
        <div>
          <p className="hero-eyebrow">Recorrido de hoy</p>
          <h1 className="hero-title">{statusText}</h1>
        </div>
        <span className={`status-chip${statusChip.className ? ` ${statusChip.className}` : ''}`}>
          {statusChip.label}
        </span>
      </div>

      {/* Imagen de la ruta */}
      <RouteImage className="map-box" src={routeImageSrc} />

      <div className="hero-bottom">
        <div className="eta">
          <span className="eta-label">Llegada estimada</span>
          <span className="eta-time">{etaLabel}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </section>
  );
}
