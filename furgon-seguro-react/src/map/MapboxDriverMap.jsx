/**
 * MapboxDriverMap — Mapa interactivo para la vista del conductor.
 * Muestra el recorrido completo del furgón escolar:
 *  - Colegio de origen y todas las paradas de los alumnos.
 *  - Ruta completa planificada con trazado nítido por calles.
 *  - Recorrido activo en vivo: el furgón avanza trazando la línea del camino recorrido.
 *  - Sin etiquetas flotantes dentro del mapa.
 */
import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getMapEngine,
  STOP_COORDS, DRIVER_ROUTE_COORDS, STATE_MARKER_COLORS,
} from './config.js';

const STATE_LABEL = {
  subio:         'Subió ✓',
  entregado:     'Entregado ✓',
  no_subio:      'No asiste ✕',
  listo_entrega: 'Listo para entregar',
  en_recorrido:  'En recorrido',
  pendiente:     'Pendiente',
};

/* Suavizador de coordenadas entre puntos de parada */
function interpolatePoints(coords, steps = 5) {
  if (!coords || coords.length < 2) return coords ?? [];
  const result = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      result.push([
        Number((a[0] + (b[0] - a[0]) * t).toFixed(6)),
        Number((a[1] + (b[1] - a[1]) * t).toFixed(6)),
      ]);
    }
  }
  result.push(coords[coords.length - 1]);
  return result;
}

const DENSE_DRIVER_ROUTE = interpolatePoints(DRIVER_ROUTE_COORDS, 6);

export default function MapboxDriverMap({
  students      = [],
  routeStatus   = 'en_ruta',
  nextStopIndex = 0,
  busPosition   = null,
}) {
  const containerRef    = useRef(null);
  const mapRef          = useRef(null);
  const busRef          = useRef(null);
  const stopMkRef       = useRef([]);
  const loadedRef       = useRef(false);
  const studentsRef     = useRef(students);
  const [driverStep, setDriverStep] = useState(0);

  useEffect(() => { studentsRef.current = students; }, [students]);

  /* ── Animación continua del furgón por la ruta de paradas ── */
  useEffect(() => {
    if (routeStatus !== 'en_ruta') return undefined;

    const total = DENSE_DRIVER_ROUTE.length;
    const interval = setInterval(() => {
      setDriverStep((prev) => (prev + 1 >= total ? 0 : prev + 1));
    }, 1400);

    return () => clearInterval(interval);
  }, [routeStatus]);

  /* ── Inicializar mapa ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const engine = getMapEngine();

    const map = new engine.lib.Map({
      container: containerRef.current,
      style: engine.style,
      center: [STOP_COORDS[0].lng, STOP_COORDS[0].lat],
      zoom: 13.0,
      attributionControl: false, // Sin etiquetas ni créditos dentro del mapa
    });

    // Control de zoom discreto en la esquina superior derecha
    map.addControl(new engine.lib.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      loadedRef.current = true;
      map.resize();

      /* — Marcador del colegio — */
      const elSch = _makeEl('map-marker school-marker', '🏫');
      new engine.lib.Marker({ element: elSch })
        .setLngLat([STOP_COORDS[0].lng, STOP_COORDS[0].lat])
        .setPopup(new engine.lib.Popup({ offset: 28 }).setText('Colegio Los Robles · Origen'))
        .addTo(map);

      /* — Marcadores de paradas — */
      const markers = [];
      STOP_COORDS.slice(1).forEach((stop, idx) => {
        const student = studentsRef.current[idx];
        const state   = student?.state ?? 'pendiente';
        const color   = STATE_MARKER_COLORS[state] ?? STATE_MARKER_COLORS.pendiente;
        const label   = student ? (STATE_LABEL[state] ?? 'Pendiente') : 'Parada';

        const el = _makeStopEl(stop.icon, color);
        el.title = `${stop.label} · ${label}`;

        const popup = new engine.lib.Popup({ offset: 28 }).setHTML(
          `<div class="map-popup">
            <strong>${stop.icon} ${stop.label}</strong>
            <span class="pop-num">Parada #${stop.stopNum}${student?.address ? ` · ${student.address}` : ''}</span>
            <span class="pop-state" style="color:${color}">${label}</span>
          </div>`
        );

        const mk = new engine.lib.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(popup)
          .addTo(map);
        markers.push({ mk, el, idx });
      });
      stopMkRef.current = markers;

      /* — Marcador del furgón animado — */
      const elBus = document.createElement('div');
      elBus.className = 'map-marker bus-live-marker';
      elBus.innerHTML = '<span class="bus-icon">🚐</span>';
      elBus.title = 'Furgón en recorrido';
      const busMk = new engine.lib.Marker({ element: elBus })
        .setLngLat([STOP_COORDS[0].lng, STOP_COORDS[0].lat])
        .addTo(map);
      busRef.current = busMk;

      /* 1. Fuente: Ruta completa planificada */
      map.addSource('driver-route-full', {
        type: 'geojson',
        data: _lineFeature(DENSE_DRIVER_ROUTE),
      });

      /* Contorno blanco nítido */
      map.addLayer({
        id: 'drf-casing',
        type: 'line',
        source: 'driver-route-full',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
      });

      /* Línea planificada completa */
      map.addLayer({
        id: 'drf-fill',
        type: 'line',
        source: 'driver-route-full',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#f59e0b',
          'line-width': 4.5,
          'line-opacity': 0.85,
        },
      });

      /* 2. Fuente: Recorrido activo completado por el furgón */
      map.addSource('driver-route-traveled', {
        type: 'geojson',
        data: _lineFeature([DENSE_DRIVER_ROUTE[0], DENSE_DRIVER_ROUTE[1]]),
      });

      /* Línea de recorrido completado (verde brillante) */
      map.addLayer({
        id: 'drt-fill',
        type: 'line',
        source: 'driver-route-traveled',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#16a34a',
          'line-width': 6,
          'line-opacity': 0.98,
        },
      });

      /* — Ajustar vista abarcando todas las paradas — */
      const BoundsClass = engine.lib.LngLatBounds;
      const bounds = STOP_COORDS.reduce(
        (b, c) => b.extend([c.lng, c.lat]),
        new BoundsClass([STOP_COORDS[0].lng, STOP_COORDS[0].lat], [STOP_COORDS[0].lng, STOP_COORDS[0].lat])
      );
      map.fitBounds(bounds, { padding: 44, duration: 900, maxZoom: 14.5 });
    });

    const t = setTimeout(() => map.resize(), 300);
    mapRef.current = map;

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      busRef.current = null;
      stopMkRef.current = [];
      loadedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Actualizar posición y línea de recorrido del furgón ── */
  useEffect(() => {
    if (!busRef.current) return;

    let targetCoord = DENSE_DRIVER_ROUTE[driverStep] ?? DENSE_DRIVER_ROUTE[0];
    if (Array.isArray(busPosition)) {
      targetCoord = busPosition;
    }

    busRef.current.setLngLat(targetCoord);

    if (loadedRef.current && mapRef.current) {
      const source = mapRef.current.getSource('driver-route-traveled');
      if (source) {
        const traveled = DENSE_DRIVER_ROUTE.slice(0, Math.max(2, driverStep + 1));
        source.setData(_lineFeature(traveled));
      }
    }
  }, [driverStep, busPosition]);

  /* ── Actualizar colores al cambiar estado de alumnos ── */
  useEffect(() => {
    if (!loadedRef.current) return;
    stopMkRef.current.forEach(({ el, idx }) => {
      const st = students[idx];
      if (!st) return;
      const color = STATE_MARKER_COLORS[st.state] ?? STATE_MARKER_COLORS.pendiente;
      el.style.background = color;
      el.title = `${STOP_COORDS[idx + 1]?.label ?? ''} · ${STATE_LABEL[st.state] ?? ''}`;
    });
  }, [students]);

  /* ── Opacidad según estado de ruta ── */
  useEffect(() => {
    if (!busRef.current) return;
    busRef.current.getElement().style.opacity = routeStatus === 'finalizado' ? '0.45' : '1';
  }, [routeStatus]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        className="driver-map-real-canvas"
        aria-label="Mapa del recorrido del conductor con paradas"
      />
    </div>
  );
}

/* ── Helpers ── */
function _makeEl(className, emoji) {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = emoji;
  return el;
}

function _makeStopEl(emoji, color) {
  const el = document.createElement('div');
  el.className = 'driver-map-stop-marker';
  el.style.background = color;
  el.innerHTML = `<span class="stop-emoji">${emoji}</span>`;
  return el;
}

function _lineFeature(coords) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords.length > 1 ? coords : [coords[0], coords[0]] },
  };
}
