import { lazy, Suspense } from 'react';

// Lazy-load del mapa Mapbox para optimizar el bundle inicial
const MapboxParentCard = lazy(() => import('../map/MapboxParentCard.jsx'));

export default function RouteCard({
  attending,
  statusText,
  statusChip,
  progressPct,
  etaLabel,
  origin,
  destination,
  busPosition,
  routeCoords,
  traveledCoords,
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

      {/* Mapa Mapbox GL JS */}
      <Suspense
        fallback={
          <div className="map-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: '#7c8a72' }}>Cargando mapa…</span>
          </div>
        }
      >
        <MapboxParentCard
          attending={attending}
          origin={origin}
          destination={destination}
          busPosition={busPosition}
          routeCoords={routeCoords}
          traveledCoords={traveledCoords}
        />
      </Suspense>

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
