import { lazy, Suspense, useState } from 'react';
import { MapPinIcon } from './icons.jsx';

// Lazy-load del mapa Mapbox del conductor
const MapboxDriverMap = lazy(() => import('../map/MapboxDriverMap.jsx'));

export default function DriverMap({
  students      = [],
  routeStatus   = 'en_ruta',
  nextStopIndex = 2,
  busPosition   = null,
}) {
  const [activeTab, setActiveTab] = useState('mapa');

  const statusLabel =
    routeStatus === 'en_ruta'   ? 'En marcha' :
    routeStatus === 'pausado'   ? 'En pausa' : 'Finalizado';

  return (
    <div className="driver-map-card">
      <div className="driver-map-header">
        <div>
          <span className="driver-card-eyebrow">Ruta en vivo · {statusLabel}</span>
          <h3 className="driver-card-title">Recorrido Providencia · Los Robles</h3>
        </div>
        <div className="map-view-toggle">
          <button
            type="button"
            className={`map-tab-btn${activeTab === 'mapa' ? ' active' : ''}`}
            onClick={() => setActiveTab('mapa')}
          >
            🗺️ Mapa
          </button>
          <button
            type="button"
            className={`map-tab-btn${activeTab === 'paradas' ? ' active' : ''}`}
            onClick={() => setActiveTab('paradas')}
          >
            Paradas ({students.length})
          </button>
        </div>
      </div>

      {activeTab === 'mapa' ? (
        <div className="driver-map-real-container">
          <Suspense
            fallback={
              <div className="driver-map-real-canvas" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5ece0' }}>
                <span style={{ fontSize: 13, color: '#7c8a72' }}>Cargando mapa…</span>
              </div>
            }
          >
            <MapboxDriverMap
              students={students}
              routeStatus={routeStatus}
              nextStopIndex={nextStopIndex}
              busPosition={busPosition}
            />
          </Suspense>

          {/* Leyenda de estados */}
          <div className="driver-map-legend-row">
            <span className="legend-item">🟡 Pendiente</span>
            <span className="legend-item">🟢 A bordo</span>
            <span className="legend-item">🔵 En ruta</span>
            <span className="legend-item">🟣 Por entregar</span>
            <span className="legend-item">⚪ Entregado</span>
            <span className="legend-item">🔴 No asiste</span>
          </div>
        </div>
      ) : (
        /* ── Vista de lista de paradas ── */
        <div className="driver-stops-timeline">
          {students.map((student, idx) => {
            const isNext   = idx === nextStopIndex;
            const isDone   = student.state === 'entregado';
            const isAbsent = student.state === 'no_subio';

            return (
              <div
                key={student.id}
                className={`timeline-stop-item${isNext ? ' is-next' : ''}${isDone ? ' is-done' : ''}${isAbsent ? ' is-absent' : ''}`}
              >
                <div className="stop-timeline-left">
                  <div className="stop-badge-circle">
                    {isDone ? '✓' : isAbsent ? '✕' : isNext ? '🚐' : idx + 1}
                  </div>
                  {idx < students.length - 1 && <div className="timeline-connector" />}
                </div>

                <div className="stop-timeline-content">
                  <div className="stop-header-row">
                    <strong>{student.name}</strong>
                    <span className="stop-eta">{student.eta}</span>
                  </div>
                  <span className="stop-address">
                    <MapPinIcon width={12} height={12} />
                    {student.address}
                  </span>
                  <div className="stop-tags">
                    <span className="stop-course">{student.grade}</span>
                    <span className="stop-guardian">Recibe: {student.authorizedGuardian}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
