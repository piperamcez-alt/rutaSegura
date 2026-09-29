import { useCallback, useEffect, useState } from 'react';
import {
  loadRouteImage,
  persistRouteImage,
  prepareRouteImage,
  removeRouteImage,
} from '../services/routeImageService.js';

/**
 * Estado de la imagen de la ruta. Se sincroniza con el resto de la app
 * mediante el evento 'furgon:sync' y el evento 'storage' (otras pestañas),
 * igual que el resto del estado compartido entre apoderado y conductor.
 */
export function useRouteImage() {
  const [image, setImage] = useState(() => loadRouteImage());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setImage(loadRouteImage());
    window.addEventListener('furgon:sync', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('furgon:sync', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const selectFile = useCallback(async (file) => {
    setError('');
    setBusy(true);
    try {
      const { dataUrl } = await prepareRouteImage(file);
      if (!persistRouteImage(dataUrl)) {
        throw new Error('No hay espacio suficiente en el navegador para guardar la imagen.');
      }
      setImage(dataUrl);
      window.dispatchEvent(new Event('furgon:sync'));
    } catch (e) {
      setError(e.message || 'No se pudo cargar la imagen.');
    } finally {
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => {
    removeRouteImage();
    setImage(null);
    setError('');
    window.dispatchEvent(new Event('furgon:sync'));
  }, []);

  return { image, error, busy, selectFile, clear };
}
