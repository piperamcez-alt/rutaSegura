/**
 * Servicio de la imagen de la ruta del furgón.
 *
 * Hoy la imagen se guarda en el navegador (localStorage) para que la interfaz
 * funcione sin backend de archivos. Toda la lógica de almacenamiento está
 * aislada en este archivo: para pasar a Supabase Storage solo hay que
 * reemplazar `persistRouteImage` / `loadRouteImage` / `removeRouteImage`
 * (por ejemplo, para que llamen a un endpoint de Django que suba el Blob a un
 * bucket) sin tocar ningún componente.
 */
import { safeStorage } from '../security/index.js';

export const ROUTE_IMAGE_KEY = 'route-image';
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // archivo original
const MAX_DIMENSION = 1280;                    // lado mayor tras reducir
const JPEG_QUALITY = 0.85;

export function validateImageFile(file) {
  if (!file) return 'No se seleccionó ningún archivo.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WebP.';
  if (file.size > MAX_FILE_BYTES) return 'La imagen supera el máximo de 8 MB.';
  return null;
}

function readAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

/**
 * Reduce la imagen y la devuelve como { blob, dataUrl }.
 * `blob` es lo que después se subiría a Supabase Storage.
 */
export async function prepareRouteImage(file) {
  const error = validateImageFile(file);
  if (error) throw new Error(error);

  const img = await readAsImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // PNG con transparencia → fondo blanco al pasar a JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  return { blob, dataUrl };
}

export function loadRouteImage() {
  const value = safeStorage.get(ROUTE_IMAGE_KEY);
  return value && value.startsWith('data:image/') ? value : null;
}

/** Devuelve true si se pudo guardar (localStorage puede estar lleno). */
export function persistRouteImage(dataUrl) {
  return safeStorage.set(ROUTE_IMAGE_KEY, dataUrl);
}

export function removeRouteImage() {
  safeStorage.remove(ROUTE_IMAGE_KEY);
}
