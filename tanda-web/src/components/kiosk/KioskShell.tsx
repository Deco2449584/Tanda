'use client';

import { useEffect, type ReactNode } from 'react';

type OrientationLockType =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

async function lockKioskLandscape(): Promise<void> {
  if (typeof window === 'undefined') return;

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: OrientationLockType) => Promise<void>;
  };

  if (typeof orientation?.lock !== 'function') {
    return;
  }

  try {
    await orientation.lock('landscape');
  } catch {
    // Browsers often require a user gesture or ignore lock outside fullscreen / PWA.
    try {
      await orientation.lock('landscape-primary');
    } catch {
      // Keep current orientation; CSS landscape layout still applies when rotated.
    }
  }
}

/** Visual container for the kiosk routes: locks scrolling and prefers landscape. */
export function KioskShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.height = '100dvh';

    void lockKioskLandscape();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void lockKioskLandscape();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;

      try {
        screen.orientation?.unlock?.();
      } catch {
        // Ignore unlock failures when leaving kiosk.
      }
    };
  }, []);

  return (
    <div
      className="kiosk-ambient fixed inset-0 z-50 h-[100dvh] w-dvw touch-manipulation select-none overflow-x-hidden overflow-y-auto [-webkit-overflow-scrolling:touch] [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
