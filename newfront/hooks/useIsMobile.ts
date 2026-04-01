import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Reactive hook that tracks whether the viewport is below the mobile breakpoint.
 * Listens to the `resize` event and cleans up on unmount.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);

    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
