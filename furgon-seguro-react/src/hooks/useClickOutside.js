import { useEffect, useRef } from 'react';

/**
 * Calls `onOutside` when a pointer event happens outside every ref in
 * `refs`, and also on Escape (keyboard-accessible dismissal). Only attaches
 * the listeners while `active` is true, avoiding unnecessary listener churn.
 */
export function useClickOutside(refs, onOutside, active = true) {
  const onOutsideRef = useRef(onOutside);
  const refsRef = useRef(refs);

  useEffect(() => {
    onOutsideRef.current = onOutside;
  });

  useEffect(() => {
    refsRef.current = refs;
  });

  useEffect(() => {
    if (!active) return undefined;

    function handlePointer(event) {
      const currentRefs = refsRef.current;
      const list = Array.isArray(currentRefs) ? currentRefs : [currentRefs];
      const clickedInside = list.some((ref) => ref?.current && ref.current.contains(event.target));
      if (!clickedInside) {
        onOutsideRef.current?.();
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') {
        onOutsideRef.current?.();
      }
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [active]);
}
