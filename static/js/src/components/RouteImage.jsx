import { useState } from 'react';

/**
 * Ruta de la imagen por defecto.
 * Puedes cambiar esta ruta directamente aquí o pasar la propiedad `src` al componente.
 * Ejemplo: '/static/images/ruta.png' o una URL web directa.
 */
export const DEFAULT_ROUTE_IMAGE_SRC = '/static/images/ruta.png';

/**
 * Componente para mostrar la imagen de la ruta del furgón.
 * La imagen se define directamente en el código mediante el prop `src`.
 *
 * @param {Object} props
 * @param {string} [props.className='map-box'] - Clase CSS contenedora.
 * @param {string} [props.src=DEFAULT_ROUTE_IMAGE_SRC] - Ruta o URL de la imagen.
 * @param {string} [props.alt='Ruta del furgón escolar'] - Texto alternativo.
 */
export default function RouteImage({
  className = 'map-box',
  src = DEFAULT_ROUTE_IMAGE_SRC,
  alt = 'Ruta del furgón escolar',
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  const hasSrc = Boolean(src && src.trim());

  return (
    <div className={`${className} route-image`}>
      {hasSrc && !loadFailed ? (
        <img
          className="route-image-preview"
          src={src}
          alt={alt}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <div className="route-image-empty">
          <span className="route-image-icon" aria-hidden="true">🗺️</span>
          <strong>Ruta del furgón</strong>
          <span className="route-image-hint">
            {hasSrc && loadFailed
              ? `No se encontró la imagen en: "${src}"`
              : 'Define la ruta de la imagen en el prop src'}
          </span>
        </div>
      )}
    </div>
  );
}
