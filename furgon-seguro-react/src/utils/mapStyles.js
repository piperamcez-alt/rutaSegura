// Helper central de estilos y configuración de mapas para MapLibre GL
// Funciona 100% sin requerir clave de API (usando OpenStreetMap estándar),
// y si el usuario configura VITE_MAPTILER_KEY, aprovecha los estilos vectoriales de MapTiler.

export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? '';

export const hasValidMapTilerKey = Boolean(
  MAPTILER_KEY &&
  MAPTILER_KEY.trim() !== '' &&
  MAPTILER_KEY !== 'YOUR_MAPTILER_API_KEY_HERE'
);

// Estilo libre estándar de OpenStreetMap (sin marcas de agua ni API key requerida)
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
 * Obtiene el estilo para MapLibre GL:
 * - Si hay MapTiler key válida -> estilo vectorial MapTiler Streets v2
 * - Si no -> estilo OpenStreetMap 100% libre sin API key ni marcas de agua
 */
export function getMapStyle() {
  if (hasValidMapTilerKey) {
    return `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;
  }
  return FREE_OSM_STYLE;
}

// Ruta realista por calles de Providencia (Colegio Los Robles -> Domicilio Martín Reyes)
export const FALLBACK_PARENT_ROUTE = [
  [-70.6350, -33.4453], // Colegio Los Robles (Av. Providencia / Baquedano)
  [-70.6338, -33.4442],
  [-70.6320, -33.4428],
  [-70.6302, -33.4414],
  [-70.6285, -33.4400],
  [-70.6268, -33.4386],
  [-70.6250, -33.4372],
  [-70.6232, -33.4358],
  [-70.6214, -33.4344],
  [-70.6198, -33.4332],
  [-70.6180, -33.4320], // Llegada a Casa
];

// Ruta del conductor conectando todas las paradas en secuencia
export const DRIVER_ROUTE_POINTS = [
  [-70.6350, -33.4453], // 🏫 Colegio
  [-70.6300, -33.4405],
  [-70.6240, -33.4360],
  [-70.6180, -33.4320], // 👧 Parada 1: Sofía Valenzuela
  [-70.6210, -33.4335],
  [-70.6240, -33.4350], // 👦 Parada 2: Lucas Gómez
  [-70.6265, -33.4370],
  [-70.6290, -33.4390], // 🧒 Parada 3: Martín Reyes
  [-70.6250, -33.4410],
  [-70.6210, -33.4430], // 👧 Parada 4: Valentina Silva
  [-70.6180, -33.4445],
  [-70.6150, -33.4460], // 👦 Parada 5: Mateo Castro
  [-70.6125, -33.4480],
  [-70.6100, -33.4500], // 👧 Parada 6: Emilia Morales
];
