/**
 * Hook: useRouteProgress
 * Simula el avance del furgón (progreso, hora estimada de llegada y texto de
 * estado) en pasos regulares, sin depender de ningún servicio externo.
 * Reemplaza al antiguo useMapboxRoute conservando el mismo comportamiento
 * visible: el recorrido avanza mientras el alumno asiste, se reinicia al
 * llegar y muestra "Llegó" al final.
 */
import { useCallback, useEffect, useState } from 'react';

const TOTAL_STEPS    = 31;   // mismo largo que la ruta suavizada anterior
const STEP_MS        = 1800;
const START_ETA_MINS = 9;
const RESTART_DELAY  = 5000;

export function useRouteProgress(attending) {
  const [step, setStep]       = useState(0);
  const [etaMins, setEtaMins] = useState(START_ETA_MINS);

  const arrived = step >= TOTAL_STEPS - 1;

  const resetRoute = useCallback(() => {
    setStep(0);
    setEtaMins(START_ETA_MINS);
  }, []);

  useEffect(() => {
    if (!attending) return undefined;
    let restartTimer;

    const interval = setInterval(() => {
      setStep((curr) => {
        if (curr >= TOTAL_STEPS - 1) {
          if (!restartTimer) {
            restartTimer = setTimeout(() => {
              restartTimer = null;
              setStep(0);
              setEtaMins(START_ETA_MINS);
            }, RESTART_DELAY);
          }
          return curr;
        }
        setEtaMins((m) => Math.max(1, m - START_ETA_MINS / TOTAL_STEPS));
        return curr + 1;
      });
    }, STEP_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(restartTimer);
    };
  }, [attending]);

  const progressPct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  let etaLabel = 'Llegó';
  if (!arrived) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + Math.round(etaMins));
    etaLabel = d.toLocaleTimeString('es-CL', { hour: 'numeric', minute: '2-digit' });
  }

  const statusText = arrived
    ? 'El furgón llegó a casa'
    : step >= TOTAL_STEPS - 3
    ? 'A punto de llegar'
    : 'En camino a casa';

  return { progressPct, etaLabel, statusText, arrived, resetRoute };
}
