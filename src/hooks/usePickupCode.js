import { useCallback, useRef, useState } from 'react';

/**
 * Genera y gestiona un código PIN de 4 dígitos único por sesión de recogida.
 *
 * El código se genera en el momento en que el chofer marca al niño como
 * "recogido" (`generateCode`). Una vez generado, permanece visible hasta que
 * se invoca `clearCode` (p. ej. al cambiar de apoderado o al iniciar
 * un nuevo recorrido).
 *
 * La unicidad se garantiza dentro de la misma sesión mediante un Set que
 * recuerda todos los códigos ya emitidos; en un sistema real esto lo
 * controlaría el backend.
 */
export function usePickupCode() {
  const [code, setCode] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const usedCodes = useRef(new Set());

  const generateCode = useCallback(() => {
    let candidate;
    let attempts = 0;
    // Evitar colisiones dentro de la sesión
    do {
      candidate = String(Math.floor(1000 + Math.random() * 9000));
      attempts++;
    } while (usedCodes.current.has(candidate) && attempts < 100);

    usedCodes.current.add(candidate);
    setCode(candidate);
    setGeneratedAt(new Date());
    return candidate;
  }, []);

  const clearCode = useCallback(() => {
    setCode(null);
    setGeneratedAt(null);
  }, []);

  return { code, generatedAt, generateCode, clearCode };
}
