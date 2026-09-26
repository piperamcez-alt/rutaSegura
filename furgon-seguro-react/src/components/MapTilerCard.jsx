import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle, FALLBACK_PARENT_ROUTE } from '../utils/mapStyles.js';

export default function MapTilerCard({
  attending = true,
  origin,
  destination,
  busPosition,
  routeCoords = [],
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const routeSourceLoadedRef = useRef(false);
  const routeCoordsRef = useRef(routeCoords.length > 0 ? routeCoords : FALLBACK_PARENT_ROUTE);

  useEffect(() => {
    if (routeCoords && routeCoords.length > 0) {
      routeCoordsRef.current = routeCoords;
    }
  }, [routeCoords]);


  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const centerLng = origin?.lng ?? -70.6350;
    const centerLat = origin?.lat ?? -33.4453;
    const destLng   = destination?.lng ?? -70.6180;
    const destLat   = destination?.lat ?? -33.4320;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getMapStyle(),
      center: [centerLng, centerLat],
      zoom: 13.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      routeSourceLoadedRef.current = true;
      map.resize();

      // Marker Colegio (Origen)
      const elSchool = document.createElement('div');
      elSchool.className = 'map-marker school-marker';
      elSchool.innerHTML = '🏫';
      elSchool.title = 'Colegio Los Robles';
      new maplibregl.Marker({ element: elSchool })
        .setLngLat([centerLng, centerLat])
        .addTo(map);

      // Marker Casa (Destino)
      const elHome = document.createElement('div');
      elHome.className = 'map-marker home-marker';
      elHome.innerHTML = '🏠';
      elHome.title = 'Casa de Martín';
      new maplibregl.Marker({ element: elHome })
        .setLngLat([destLng, destLat])
        .addTo(map);

      // Marker Furgón (dinámico)
      const elBus = document.createElement('div');
      elBus.className = 'map-marker bus-live-marker';
      elBus.innerHTML = '🚌';
      elBus.title = 'Furgón Los Robles';
      const busMarker = new maplibregl.Marker({ element: elBus })
        .setLngLat([centerLng, centerLat])
        .addTo(map);
      busMarkerRef.current = busMarker;

      const initialCoords = routeCoordsRef.current.length > 0
        ? routeCoordsRef.current
        : FALLBACK_PARENT_ROUTE;

      // Capa GeoJSON para la ruta de conducción
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: initialCoords,
          },
        },
      });

      map.addLayer({
        id: 'route-line-casing',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7,
          'line-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#2f6b18',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });

      // Ajustar los límites del mapa para mostrar colegio y casa
      const bounds = new maplibregl.LngLatBounds();
      initialCoords.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 35, duration: 800 });
    });

    // Resize diferido para asegurar render tras layouts flex
    const timer = setTimeout(() => {
      map.resize();
    }, 250);

    mapRef.current = map;

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      busMarkerRef.current = null;
      routeSourceLoadedRef.current = false;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  // Actualizar la polyline cuando cambien las coordenadas de la ruta
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeSourceLoadedRef.current || !routeCoords || routeCoords.length === 0) return;

    const source = map.getSource('route');
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoords,
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      routeCoords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 35, duration: 1000 });
    }
  }, [routeCoords]);

  // Actualizar la posición del furgón animado
  useEffect(() => {
    if (!busMarkerRef.current) return;
    if (attending && busPosition && Array.isArray(busPosition)) {
      busMarkerRef.current.setLngLat(busPosition);
      busMarkerRef.current.getElement().style.display = 'flex';
    } else {
      busMarkerRef.current.getElement().style.display = attending ? 'flex' : 'none';
    }
  }, [busPosition, attending]);

  return (
    <div className="map-box" style={{ position: 'relative', width: '100%', height: '190px' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
