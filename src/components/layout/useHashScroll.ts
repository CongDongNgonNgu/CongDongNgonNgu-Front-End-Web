import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useHashScroll() {
  const { hash, pathname, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    // Wait until route content and navigation overlays have committed.
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, pathname, key]);
}
