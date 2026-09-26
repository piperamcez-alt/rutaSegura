/**
 * MapboxParentCard — Mapa interactivo para la vista del apoderado.
 * Muestra el recorrido escolar en vivo:
 *  - Línea base de ruta planificada.
 *  - Línea resaltada del recorrido completado por el furgón.
 *  - Furgón escolar animado avanzando a lo largo de las calles.
 *  - Sin etiquetas flotantes dentro del mapa.
 */
import { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  getMapEngine,
  SCHOOL_COORD, HOME_COORD, PARENT_ROUTE_COORDS,
} from './config.js';

export default function MapboxParentCard({
  attending = true,
  origin   = { lat: SCHOOL_COORD[1], lng: SCHOOL_COORD[0] },
  destination = { lat: HOME_COORD[1], lng: HOME_COORD[0] },
  busPosition = null,
  routeCoords = [],
  traveledCoords = [],
}) {
  const containerRef       = useRef(null);
  const mapRef             = useRef(null);
  const busRef             = useRef(null);
  const loadedRef          = useRef(false);
  const coordsRef          = useRef(routeCoords.length > 0 ? routeCoords : PARENT_ROUTE_COORDS);
  const traveledCoordsRef  = useRef(traveledCoords);

  useEffect(() => {
    coordsRef.current = routeCoords.length > 0 ? routeCoords : PARENT_ROUTE_COORDS;
  }, [routeCoords]);

  useEffect(() => {
    traveledCoordsRef.current = traveledCoords;
  }, [traveledCoords]);

  /* ── Inicializar el mapa ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const engine = getMapEngine();
    const center = [origin.lng ?? SCHOOL_COORD[0], origin.lat ?? SCHOOL_COORD[1]];

    const map = new engine.lib.Map({
      container: containerRef.current,
      style: engine.style,
      center,
      zoom: 13.8,
      attributionControl: false, // Sin etiquetas ni créditos dentro del mapa
    });

    map.on('load', () => {
      loadedRef.current = true;
      map.resize();

      /* — Marcador del colegio — */
      const elSchool = _makeEl('map-marker school-marker', '🏫', 'Colegio Los Robles');
      new engine.lib.Marker({ element: elSchool })
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new engine.lib.Popup({ offset: 28 }).setText('Colegio Los Robles'))
        .addTo(map);

      /* — Marcador de la casa — */
      const elHome = _makeEl('map-marker home-marker', '🏠', 'Casa de Martín');
      new engine.lib.Marker({ element: elHome })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new engine.lib.Popup({ offset: 28 }).setText('Casa · Destino'))
        .addTo(map);

      /* — Marcador del furgón animado con halo — */
      const elBus = document.createElement('div');
      elBus.className = 'map-marker bus-live-marker';
      elBus.innerHTML = '<span class="bus-icon">🚌</span>';
      elBus.title = 'Furgón Los Robles';
      const busMk = new engine.lib.Marker({ element: elBus })
        .setLngLat(center)
        .addTo(map);
      busRef.current = busMk;

      const fullCoords = coordsRef.current;
      const initialTraveled = traveledCoordsRef.current.length > 0
        ? traveledCoordsRef.current
        : [fullCoords[0], fullCoords[1] ?? fullCoords[0]];

      /* 1. Fuente: Ruta completa planificada */
      map.addSource('parent-route-full', {
        type: 'geojson',
        data: _lineFeature(fullCoords),
      });

      /* Capa de sombra / contorno blanco para la ruta */
      map.addLayer({
        id: 'prf-casing',
        type: 'line',
        source: 'parent-route-full',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
      });

      /* Capa de ruta planificada restante (color verde suave) */
      map.addLayer({
        id: 'prf-fill',
        type: 'line',
        source: 'parent-route-full',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#86efac', 'line-width': 4.5, 'line-opacity': 0.8 },
      });

      /* 2. Fuente: Recorrido activo completado por el furgón */
      map.addSource('parent-route-traveled', {
        type: 'geojson',
        data: _lineFeature(initialTraveled),
      });

      /* Capa del recorrido activo del furgón (verde bosque brillante) */
      map.addLayer({
        id: 'prt-fill',
        type: 'line',
        source: 'parent-route-traveled',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#2e7d32',
          'line-width': 6,
          'line-opacity': 0.98,
        },
      });

      /* — Ajustar vista abarcando toda la ruta — */
      _fitBounds(map, fullCoords, engine.lib);
    });

    const t = setTimeout(() => map.resize(), 300);
    mapRef.current = map;

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      busRef.current = null;
      loadedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Animar posición del furgón y trazar su recorrido activo ── */
  useEffect(() => {
    if (!busRef.current || !busPosition) return;
    busRef.current.setLngLat(busPosition);

    if (loadedRef.current && mapRef.current) {
      const source = mapRef.current.getSource('parent-route-traveled');
      if (source && Array.isArray(traveledCoords) && traveledCoords.length > 0) {
        source.setData(_lineFeature(traveledCoords));
      }
    }
  }, [busPosition, traveledCoords]);

  /* ── Actualizar ruta si cambia externamente ── */
  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return;
    const source = mapRef.current.getSource('parent-route-full');
    if (source && Array.isArray(routeCoords) && routeCoords.length > 0) {
      source.setData(_lineFeature(routeCoords));
    }
  }, [routeCoords]);

  /* ── Opacidad si el alumno no asiste ── */
  useEffect(() => {
    if (!busRef.current) return;
    busRef.current.getElement().style.opacity = attending ? '1' : '0.35';
  }, [attending]);

  return (
    <div className="map-box" style={{ position: 'relative', width: '100%', height: '210px', margin: '14px 0' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
        aria-label="Mapa de seguimiento en vivo del furgón escolar"
      />
    </div>
  );
}

/* ── Helpers ── */
function _makeEl(className, emoji, title = '') {
  const el = document.createElement('div');
  el.className = className;
  el.innerHTML = emoji;
  if (title) el.title = title;
  return el;
}

function _lineFeature(coords) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords.length > 1 ? coords : [coords[0], coords[0]] },
  };
}

function _fitBounds(map, coords, lib) {
  if (!coords || coords.length === 0) return;
  const BoundsClass = lib.LngLatBounds;
  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new BoundsClass(coords[0], coords[0])
  );
  map.fitBounds(bounds, { padding: 40, duration: 800, maxZoom: 15 });
}
