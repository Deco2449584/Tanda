'use client';

import { useEffect } from 'react';
import { enterKioskFullscreen, isFullscreenActive } from '@/lib/pwa/kiosk-display';

/** Keeps kiosk punch mode in fullscreen; re-enters if the browser exits it. */
export function useKioskLockedDisplay(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    void enterKioskFullscreen();

    function onFullscreenChange() {
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
