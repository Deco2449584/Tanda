'use client';

import { useEffect, type ReactNode } from 'react';
import { isKioskStandaloneDisplay } from '@/lib/pwa/ensure-kiosk-pwa-head';

const KIOSK_SW_URL = '/kiosk/sw.js';
const KIOSK_SW_SCOPE = '/kiosk/';

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

    if (isKioskStandaloneDisplay()) {
      html.classList.add('kiosk-standalone');
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
      html.classList.remove('kiosk-standalone');
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const existing = await navigator.serviceWorker.getRegistration(KIOSK_SW_SCOPE);
      if (cancelled) return;

      if (!existing) {
        await navigator.serviceWorker.register(KIOSK_SW_URL, { scope: KIOSK_SW_SCOPE });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-dvw touch-manipulation select-none overflow-x-hidden overflow-y-auto bg-zinc-950 [-webkit-overflow-scrolling:touch] [-webkit-touch-callout:none]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
