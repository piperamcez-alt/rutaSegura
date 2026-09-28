import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle, DRIVER_ROUTE_POINTS } from '../utils/mapStyles.js';

// Coordenadas de las paradas de los alumnos (en orden del recorrido)
// Colegio origen + cada parada/domicilio
const STOP_COORDS = [
  { lng: -70.6350, lat: -33.4453, label: 'Colegio Los Robles', icon: '🏫', type: 'school' },
  { lng: -70.6180, lat: -33.4320, label: 'Sofía Valenzuela', icon: '👧', stopNum: 1 },
  { lng: -70.6240, lat: -33.4350, label: 'Lucas Gómez',       icon: '👦', stopNum: 2 },
  { lng: -70.6290, lat: -33.4390, label: 'Martín Reyes',      icon: '🧒', stopNum: 3 },
  { lng: -70.6210, lat: -33.4430, label: 'Valentina Silva',   icon: '👧', stopNum: 4 },
  { lng: -70.6150, lat: -33.4460, label: 'Mateo Castro',      icon: '👦', stopNum: 5 },
  { lng: -70.6100, lat: -33.4500, label: 'Emilia Morales',    icon: '👧', stopNum: 6 },
];

// Mapa de estado a color para marcadores
const STATE_COLORS = {
  pendiente:     '#f5c518', // amarillo
  subio:         '#4caf50', // verde
  no_subio:      '#e53935', // rojo
  en_recorrido:  '#1976d2', // azul
  listo_entrega: '#9c27b0', // morado
  entregado:     '#9e9e9e', // gris
};

export default function DriverMapReal({
  students = [],
  routeStatus = 'en_ruta',
  nextStopIndex = 0,
  busPosition = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const routeSourceLoadedRef = useRef(false);
  const studentsRef = useRef(students);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(),
      center: [STOP_COORDS[0].lng, STOP_COORDS[0].lat],
      zoom: 12.8,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      routeSourceLoadedRef.current = true;
      map.resize();

      // 1. Marcador del colegio (inicio)
      const elSchool = document.createElement('div');
      elSchool.className = 'map-marker school-marker';
      elSchool.innerHTML = '🏫';
      elSchool.title = 'Colegio Los Robles (Origen)';
      new maplibregl.Marker({ element: elSchool })
        .setLngLat([STOP_COORDS[0].lng, STOP_COORDS[0].lat])
        .setPopup(new maplibregl.Popup({ offset: 28 }).setText('Colegio Los Robles · Origen del recorrido'))
        .addTo(map);

      // 2. Marcadores de paradas (uno por alumno)
      const newMarkers = [];
      STOP_COORDS.slice(1).forEach((stop, idx) => {
        const student = studentsRef.current[idx];
        const state = student?.state || 'pendiente';
        const color = STATE_COLORS[state] || STATE_COLORS.pendiente;
        const stateLabel = student ? (
          state === 'subio' ? 'Subió ✓' :
          state === 'entregado' ? 'Entregado ✓' :
          state === 'no_subio' ? 'No asiste ✕' :
          state === 'listo_entrega' ? 'Listo para entregar' :
          state === 'en_recorrido' ? 'En recorrido' :
          'Pendiente'
        ) : 'Parada';

        const el = document.createElement('div');
        el.className = 'driver-stop-marker';
        el.style.cssText = `
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: ${color};
          border: 3px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          cursor: pointer;
          transition: transform 0.2s ease, background 0.3s ease;
        `;
        el.innerHTML = stop.icon;
        el.title = `${stop.label} · ${stateLabel}`;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 28 }).setHTML(
              `<div style="font-family:inherit;font-size:13px;line-height:1.4;color:#222;">
                <strong style="font-size:14px;color:#111;">${stop.icon} ${stop.label}</strong><br/>
                <span style="color:#666;">Parada #${stop.stopNum}${student?.address ? ` · ${student.address}` : ''}</span><br/>
                <span style="font-weight:700;color:${color};">${stateLabel}</span>
              </div>`
            )
          )
          .addTo(map);

        newMarkers.push({ marker, el, idx });
      });
      stopMarkersRef.current = newMarkers;

      // 3. Marcador del furgón (dinámico)
      const elBus = document.createElement('div');
      elBus.className = 'map-marker bus-live-marker';
      elBus.innerHTML = '🚐';
      elBus.title = 'Furgón Escolar';
      const busMarker = new maplibregl.Marker({ element: elBus })
        .setLngLat([STOP_COORDS[0].lng, STOP_COORDS[0].lat])
        .addTo(map);
      busMarkerRef.current = busMarker;

      // 4. Capa de la ruta (línea que conecta las paradas)
      map.addSource('driver-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: DRIVER_ROUTE_POINTS,
          },
        },
      });

      map.addLayer({
        id: 'driver-route-casing',
        type: 'line',
        source: 'driver-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 },
      });

      map.addLayer({
        id: 'driver-route-line',
        type: 'line',
        source: 'driver-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2f6b18', 'line-width': 4, 'line-opacity': 0.95 },
      });

      // Ajustar vista para que se vean todas las paradas
      const bounds = new maplibregl.LngLatBounds();
      STOP_COORDS.forEach((c) => bounds.extend([c.lng, c.lat]));
      map.fitBounds(bounds, { padding: 40, duration: 800, maxZoom: 14 });
    });

    const timer = setTimeout(() => {
      map.resize();
    }, 250);

    mapRef.current = map;

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      busMarkerRef.current = null;
      stopMarkersRef.current = [];
      routeSourceLoadedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Actualizar colores de los marcadores de paradas cuando cambia el estado de los alumnos
  useEffect(() => {
    if (!routeSourceLoadedRef.current) return;
    stopMarkersRef.current.forEach(({ el, idx }) => {
      const student = students[idx];
      if (!student) return;
      const color = STATE_COLORS[student.state] || STATE_COLORS.pendiente;
      el.style.background = color;
    });
  }, [students]);

  // Actualizar la posición del furgón
  useEffect(() => {
    if (!busMarkerRef.current) return;
    if (busPosition && Array.isArray(busPosition)) {
      busMarkerRef.current.setLngLat(busPosition);
      busMarkerRef.current.getElement().style.display = 'flex';
    } else {
      // Posición de la parada actual o próxima
      const activeIdx = Math.min(nextStopIndex, STOP_COORDS.length - 1);
      const stop = STOP_COORDS[activeIdx] || STOP_COORDS[0];
      if (stop) {
        busMarkerRef.current.setLngLat([stop.lng, stop.lat]);
      }
    }
  }, [busPosition, nextStopIndex]);

  // Reflejar estado de la ruta
  useEffect(() => {
    if (!busMarkerRef.current) return;
    const el = busMarkerRef.current.getElement();
    if (routeStatus === 'finalizado') {
      el.style.opacity = '0.5';
    } else {
      el.style.opacity = '1';
    }
  }, [routeStatus]);

  return (
    <div
      ref={mapContainerRef}
      className="driver-map-real-canvas"
      style={{
        width: '100%',
        height: '280px',
        minHeight: '260px',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
      }}
      aria-label="Mapa del recorrido escolar con paradas de los alumnos"
    />
  );
}
