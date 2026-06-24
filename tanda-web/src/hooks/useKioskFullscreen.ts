'use client';

import { useEffect } from 'react';
import { enterKioskFullscreen } from '@/lib/pwa/kiosk-display';

/** Request immersive fullscreen on the first user interaction (tablet kiosks). */
export function useKioskFullscreenOnInteraction() {
  useEffect(() => {
    function handleInteraction() {
      void enterKioskFullscreen();
    }

    document.addEventListener('pointerdown', handleInteraction, { once: true, passive: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);
}
