'use client';

import { useEffect } from 'react';
import { isKioskModeActive } from '@/lib/kiosk/kiosk-lock-state';
import { enterKioskFullscreen, isFullscreenActive } from '@/lib/pwa/kiosk-display';

/** Keeps kiosk punch mode in fullscreen; re-enters if the browser exits it. */
export function useKioskLockedDisplay(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !isKioskModeActive()) return;

    void enterKioskFullscreen();

    function onFullscreenChange() {
      if (!isKioskModeActive() || !enabled) return;
      if (!isFullscreenActive()) {
        void enterKioskFullscreen();
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, [enabled]);
}
