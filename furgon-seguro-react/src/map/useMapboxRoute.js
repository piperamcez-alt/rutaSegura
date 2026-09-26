/**
 * Hook: useMapboxRoute
 * Obtiene la ruta real de Mapbox Directions API entre dos puntos.
 * Fallback: polyline suavizada con interpolación cuando no hay token.
 * Anima el furgón a lo largo de la ruta de manera continua y realista.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MAPBOX_TOKEN, hasMapbox, PARENT_ROUTE_COORDS } from './config.js';

const STEP_MS        = 1800;
const START_ETA_MINS = 9;
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox/driving';

/* Suavizador de coordenadas entre puntos clave */
function interpolatePoints(coords, steps = 4) {
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

const DEFAULT_SMOOTH_ROUTE = interpolatePoints(PARENT_ROUTE_COORDS, 3);

export function useMapboxRoute(origin, destination, attending) {
  const [routeCoords, setRouteCoords] = useState(DEFAULT_SMOOTH_ROUTE);
  const [step, setStep]               = useState(0);
  const [etaMins, setEtaMins]         = useState(START_ETA_MINS);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const fetchedRef  = useRef(false);
  const intervalRef = useRef(null);

  /* ── Fetch ruta con Mapbox si hay token ── */
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (!hasMapbox || !origin || !destination) {
      setRouteCoords(DEFAULT_SMOOTH_ROUTE);
      return;
    }

    setLoading(true);
    const url =
      `${DIRECTIONS_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}.json` +
      `?access_token=${MAPBOX_TOKEN}&geometries=geojson&language=es&overview=full`;

    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`Mapbox ${r.status}`); return r.json(); })
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 0) {
          setRouteCoords(interpolatePoints(coords, 2));
        } else {
          setRouteCoords(DEFAULT_SMOOTH_ROUTE);
        }
      })
      .catch((err) => {
        console.warn('[useMapboxRoute] Fallback a ruta local:', err.message);
        setError(err.message);
        setRouteCoords(DEFAULT_SMOOTH_ROUTE);
      })
      .finally(() => setLoading(false));
  }, [origin, destination]);

  const totalSteps = routeCoords.length;
  const arrived    = totalSteps > 0 && step >= totalSteps - 1;

  const resetRoute = useCallback(() => {
    setStep(0);
    setEtaMins(START_ETA_MINS);
  }, []);

  /* ── Animación continua del furgón a lo largo de la ruta ── */
  useEffect(() => {
    if (!attending || totalSteps === 0) return undefined;

    intervalRef.current = setInterval(() => {
      setStep((curr) => {
        if (curr >= totalSteps - 1) {
          // Llegó a destino: pausa 5 segundos y vuelve a iniciar el recorrido
          setTimeout(() => {
            setStep(0);
            setEtaMins(START_ETA_MINS);
          }, 5000);
          return curr;
        }
        const next = curr + 1;
        setEtaMins((m) => Math.max(1, m - START_ETA_MINS / Math.max(totalSteps, 1)));
        return next;
      });
    }, STEP_MS);

    return () => clearInterval(intervalRef.current);
  }, [attending, totalSteps]);

  const busPosition    = routeCoords[step] ?? routeCoords[0] ?? null;
  const traveledCoords = routeCoords.slice(0, Math.max(1, step + 1));
  const progressPct    = totalSteps > 1 ? Math.round((step / (totalSteps - 1)) * 100) : 0;

  let etaLabel = 'Llegó';
  if (!arrived) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + Math.round(etaMins));
    etaLabel = d.toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit' });
  }

  const statusText = arrived
    ? 'El furgón llegó a casa'
    : step >= totalSteps - 3 && totalSteps > 1
    ? 'A punto de llegar'
    : 'En camino a casa';

  return {
    routeCoords,
    traveledCoords,
    step,
    busPosition,
    progressPct,
    etaLabel,
    statusText,
    arrived,
    resetRoute,
    loading,
    error,
  };
}
