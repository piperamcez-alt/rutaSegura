/**
 * ╔══════════════════════════════════════════════════════╗
 * ║   FURGÓN SEGURO — ADAPTADOR INTELIGENTE DE MAPA     ║
 * ║   src/map/config.js                                 ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Soporta Mapbox GL JS oficial con token ('pk.ey...').
 * Si no se ha configurado el token, utiliza automáticamente MapLibre GL
 * con OpenStreetMap en alta resolución sin necesidad de API key,
 * garantizando que el mapa NUNCA quede gris ni bloqueado.
 */
import mapboxgl from 'mapbox-gl';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

if (typeof maplibregl.setWorkerUrl === 'function' && workerUrl) {
  maplibregl.setWorkerUrl(workerUrl);
}

/* Obtener token desde .env o desde localStorage */
export function getMapboxToken() {
  const local = typeof window !== 'undefined' ? localStorage.getItem('fs_mapbox_token') : null;
  const env   = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
  return (local && local.trim()) || (env && env.trim()) || '';
}

export function saveMapboxToken(token) {
  if (typeof window !== 'undefined') {
    if (token && token.trim()) {
      localStorage.setItem('fs_mapbox_token', token.trim());
    } else {
      localStorage.removeItem('fs_mapbox_token');
    }
  }
}

export function isMapboxActive() {
  const token = getMapboxToken();
  return Boolean(token && token.startsWith('pk.'));
}

export const MAPBOX_TOKEN = getMapboxToken();
export const hasMapbox = isMapboxActive();

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';

/* Estilo libre OpenStreetMap para MapLibre (100% funcional sin API key) */
export const FREE_OSM_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/**
 * Retorna el motor de mapa adecuado:
 * - Si hay token de Mapbox ('pk...'): retorna Mapbox GL JS oficial con Mapbox Streets.
 * - Si no: retorna MapLibre GL con OpenStreetMap garantizado.
 */
export function getMapEngine() {
  const token = getMapboxToken();
  const useMapbox = Boolean(token && token.startsWith('pk.'));

  if (useMapbox) {
    mapboxgl.accessToken = token;
    return {
      lib: mapboxgl,
      style: MAPBOX_STYLE,
      isMapbox: true,
      token,
    };
  }

  return {
    lib: maplibregl,
    style: FREE_OSM_STYLE,
    isMapbox: false,
    token: '',
  };
}

/* Coordenadas del recorrido escolar en Providencia, Santiago */
export const SCHOOL_COORD  = [-70.6350, -33.4453]; // Colegio Los Robles
export const HOME_COORD    = [-70.6180, -33.4320]; // Casa Martín Reyes

/* Paradas del recorrido (index 0 = colegio) */
export const STOP_COORDS = [
  { lng: -70.6350, lat: -33.4453, label: 'Colegio Los Robles', icon: '🏫', type: 'school' },
  { lng: -70.6180, lat: -33.4320, label: 'Sofía Valenzuela',   icon: '👧', stopNum: 1 },
  { lng: -70.6240, lat: -33.4350, label: 'Lucas Gómez',        icon: '👦', stopNum: 2 },
  { lng: -70.6290, lat: -33.4390, label: 'Martín Reyes',       icon: '🧒', stopNum: 3 },
  { lng: -70.6210, lat: -33.4430, label: 'Valentina Silva',    icon: '👧', stopNum: 4 },
  { lng: -70.6150, lat: -33.4460, label: 'Mateo Castro',       icon: '👦', stopNum: 5 },
  { lng: -70.6100, lat: -33.4500, label: 'Emilia Morales',     icon: '👧', stopNum: 6 },
];

/* Polyline de ruta del apoderado (colegio → casa) */
export const PARENT_ROUTE_COORDS = [
  [-70.6350, -33.4453], [-70.6338, -33.4442], [-70.6320, -33.4428],
  [-70.6302, -33.4414], [-70.6285, -33.4400], [-70.6268, -33.4386],
  [-70.6250, -33.4372], [-70.6232, -33.4358], [-70.6214, -33.4344],
  [-70.6198, -33.4332], [-70.6180, -33.4320],
];

/* Polyline de ruta del conductor (colegio → todas las paradas) */
export const DRIVER_ROUTE_COORDS = [
  [-70.6350, -33.4453], [-70.6300, -33.4405], [-70.6240, -33.4360],
  [-70.6180, -33.4320], [-70.6210, -33.4335], [-70.6240, -33.4350],
  [-70.6265, -33.4370], [-70.6290, -33.4390], [-70.6250, -33.4410],
  [-70.6210, -33.4430], [-70.6180, -33.4445], [-70.6150, -33.4460],
  [-70.6125, -33.4480], [-70.6100, -33.4500],
];

/* Colores de marcadores por estado de alumno */
export const STATE_MARKER_COLORS = {
  pendiente:     '#f5c518',
  subio:         '#4caf50',
  no_subio:      '#e53935',
  en_recorrido:  '#1976d2',
  listo_entrega: '#9c27b0',
  entregado:     '#9e9e9e',
};
