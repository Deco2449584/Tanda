'use client';

import { useEffect, useState } from 'react';

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatClockDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function KioskClock() {
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!isMounted || !now) {
    return (
      <div
        className="mb-3 flex min-h-[4.5rem] flex-col items-center justify-center md:mb-5 md:min-h-[5.5rem]"
        aria-hidden
      >
        <div className="h-9 w-40 animate-pulse rounded-lg bg-zinc-800/80 md:h-11 md:w-48" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-zinc-800/60 md:h-3.5 md:w-64" />
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-col items-center text-center md:mb-5">
      <p
        className="text-5xl font-black tabular-nums tracking-tight text-white drop-shadow-[0_0_15px_rgba(37,99,235,0.3)] md:text-6xl"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatClockTime(now)}
      </p>
      <p className="mt-1 max-w-[min(100%,20rem)] text-xs font-semibold uppercase tracking-widest text-zinc-400 md:mt-1.5 md:max-w-none md:text-base">
        {formatClockDate(now)}
      </p>
    </div>
  );
}
