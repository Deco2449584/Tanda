'use client';

import { useEffect } from 'react';

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="fixed inset-0 z-50 h-dvh w-dvw overflow-hidden bg-zinc-950">
      {children}
    </div>
  );
}
