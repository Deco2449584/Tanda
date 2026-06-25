'use client';

import { useEffect, type ReactNode } from 'react';

/** Visual container for the kiosk routes: locks scrolling and fills the viewport. */
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

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
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
