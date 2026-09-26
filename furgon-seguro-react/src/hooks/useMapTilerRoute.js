import { useCallback, useEffect, useRef, useState } from 'react';
import { MAPTILER_KEY, hasValidMapTilerKey, FALLBACK_PARENT_ROUTE } from '../utils/mapStyles.js';

const STEP_MS = 2500;
const START_ETA_MINUTES = 9;

/**
 * Obtiene la ruta del recorrido escolar:
 * - Si existe VITE_MAPTILER_KEY válida, consulta la API de MapTiler Directions.
 * - Si no (o si la API falla/está offline), usa la ruta realista precargada por las calles de Providencia.
 * Luego anima el marcador del furgón a lo largo del recorrido.
 *
 * @param {{ lat: number, lng: number }} origin
 * @param {{ lat: number, lng: number }} destination
 * @param {boolean} attending
 */
export function useMapTilerRoute(origin, destination, attending) {
  const [routeCoords, setRouteCoords] = useState(FALLBACK_PARENT_ROUTE);
  const [step, setStep]               = useState(0);
  const [etaMinutes, setEtaMinutes]   = useState(START_ETA_MINUTES);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const fetchedRef  = useRef(false);
  const intervalRef = useRef(null);

  /* ── Fetch route from MapTiler Directions API si hay key ── */
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (!hasValidMapTilerKey) {
      // Usar ruta realista por defecto inmediatamente
      setRouteCoords(FALLBACK_PARENT_ROUTE);
      return;
    }

    setLoading(true);
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url =
      `https://api.maptiler.com/directions/v2/driving/${coords}.json` +
      `?key=${MAPTILER_KEY}&language=es`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`MapTiler Directions: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const geometry = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(geometry) && geometry.length > 0) {
          setRouteCoords(geometry);
        } else {
          setRouteCoords(FALLBACK_PARENT_ROUTE);
        }
      })
      .catch((err) => {
        console.warn('[useMapTilerRoute] Usando ruta local de respaldo:', err.message);
        setError(err.message);
        setRouteCoords(FALLBACK_PARENT_ROUTE);
      })
      .finally(() => setLoading(false));
  }, [origin, destination]);

  const totalSteps = routeCoords.length;
  const arrived    = totalSteps > 0 && step >= totalSteps - 1;

  const resetRoute = useCallback(() => {
    setStep(0);
    setEtaMinutes(START_ETA_MINUTES);
  }, []);

  /* ── Animación del furgón a lo largo de la ruta ── */
  useEffect(() => {
    if (!attending || arrived || totalSteps === 0) return undefined;

    intervalRef.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
      setEtaMinutes((m) => Math.max(1, m - START_ETA_MINUTES / Math.max(totalSteps, 1)));
    }, STEP_MS);

    return () => clearInterval(intervalRef.current);
  }, [attending, arrived, totalSteps]);

  // busPosition en [lng, lat] para MapLibre
  const busPosition = routeCoords[step] ?? routeCoords[0] ?? null;
  const progressPct = totalSteps > 1
    ? Math.round((step / (totalSteps - 1)) * 100)
    : 0;

  let etaLabel = 'Llegó';
  if (!arrived) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + Math.round(etaMinutes));
    etaLabel = now.toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit' });
  }

  let statusText = 'En camino a casa';
  if (arrived) statusText = 'El furgón llegó a casa';
  else if (step >= totalSteps - 2 && totalSteps > 1) statusText = 'A punto de llegar';

  return {
    routeCoords,   // [[lng,lat], …] para la polyline
    busPosition,   // [lng, lat] posición actual del furgón
    progressPct,
    etaLabel,
    statusText,
    arrived,
    resetRoute,
    loading,
    error,
  };
}
