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
        className="flex min-h-[5.5rem] flex-col items-center justify-center md:min-h-[6.5rem]"
        aria-hidden
      >
        <div className="h-12 w-48 animate-pulse rounded-lg bg-zinc-800/80 md:h-14 md:w-56" />
        <div className="mt-2 h-3 w-52 animate-pulse rounded bg-zinc-800/60 md:w-60" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p
        className="text-6xl font-bold tabular-nums tracking-tight text-white md:text-7xl"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatClockTime(now)}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 md:text-sm">
        {formatClockDate(now)}
      </p>
    </div>
  );
}
