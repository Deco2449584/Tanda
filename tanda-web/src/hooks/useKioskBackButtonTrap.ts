'use client';

import { useEffect, useRef } from 'react';

const TRAP_STACK_DEPTH = 16;

/**
 * Traps the browser back button while kiosk mode is active.
 * Each back press stays on the current URL and invokes `onBackAttempt`.
 */
export function useKioskBackButtonTrap(
  enabled: boolean,
  onBackAttempt: () => void,
) {
  const onBackAttemptRef = useRef(onBackAttempt);
  onBackAttemptRef.current = onBackAttempt;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const url = window.location.href;

    function pushTrapState() {
      window.history.pushState({ kioskBackTrap: true }, '', url);
    }

    // Seed the stack so many consecutive back presses cannot reach prior routes.
    for (let i = 0; i < TRAP_STACK_DEPTH; i += 1) {
      pushTrapState();
    }

    function handlePopState() {
      // Re-fill immediately so the next back press is also trapped.
      pushTrapState();
      pushTrapState();
      onBackAttemptRef.current();
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);
}
