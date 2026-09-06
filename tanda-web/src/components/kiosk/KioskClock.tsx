'use client';

import { useEffect, useState } from 'react';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';

const CX = 100;
const CY = 100;

function formatClockTime(
  date: Date,
  ianaTimeZone: string,
  options?: { showSeconds?: boolean },
): string {
  return date.toLocaleTimeString('en-AU', {
    timeZone: ianaTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: options?.showSeconds ? '2-digit' : undefined,
    hour12: true,
  });
}

function formatClockDate(date: Date, ianaTimeZone: string): string {
  return date.toLocaleDateString('en-AU', {
    timeZone: ianaTimeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function timeZoneCityLabel(timeZone: string): string {
  const city = timeZone.split('/').pop() ?? timeZone;
  return city.replace(/_/g, ' ').toUpperCase();
}

function getZonedTimeParts(date: Date, ianaTimeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: ianaTimeZone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
    second: Number(parts.find((part) => part.type === 'second')?.value ?? 0),
  };
}

function ClockHand({
  angle,
  length,
  width,
  color,
  className = '',
}: {
  angle: number;
  length: number;
  width: number;
  color: string;
  className?: string;
}) {
  return (
    <line
      x1={CX}
      y1={CY}
      x2={CX}
      y2={CY - length}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      transform={`rotate(${angle} ${CX} ${CY})`}
      className={className}
    />
  );
}

function AnalogClockFace({
  hour,
  minute,
  second,
}: {
  hour: number;
  minute: number;
  second: number;
}) {
  const secondAngle = second * 6;
  const minuteAngle = minute * 6 + second * 0.1;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const hourLabels = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-hidden>
      <defs>
        <radialGradient id="kiosk-clock-face" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
        </radialGradient>
        <linearGradient id="kiosk-clock-bezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(245,30,160,0.55)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(245,30,160,0.35)" />
        </linearGradient>
      </defs>

      <circle cx={CX} cy={CY} r="96" fill="none" stroke="url(#kiosk-clock-bezel)" strokeWidth="3" />
      <circle cx={CX} cy={CY} r="90" fill="url(#kiosk-clock-face)" />
      <circle cx={CX} cy={CY} r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {Array.from({ length: 60 }, (_, index) => {
        const angle = index * 6;
        const isHour = index % 5 === 0;
        const innerR = isHour ? 78 : 82;
        const outerR = 88;
        const rad = ((angle - 90) * Math.PI) / 180;
        return (
          <line
            key={`tick-${index}`}
            x1={CX + innerR * Math.cos(rad)}
            y1={CY + innerR * Math.sin(rad)}
            x2={CX + outerR * Math.cos(rad)}
            y2={CY + outerR * Math.sin(rad)}
            stroke={isHour ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)'}
            strokeWidth={isHour ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}

      {hourLabels.map((label, index) => {
        const angle = index * 30;
        const rad = ((angle - 90) * Math.PI) / 180;
        const radius = 68;
        return (
          <text
            key={label}
            x={CX + radius * Math.cos(rad)}
            y={CY + radius * Math.sin(rad)}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.85)"
            fontSize="11"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      <ClockHand angle={hourAngle} length={42} width={4.5} color="rgba(255,255,255,0.95)" />
      <ClockHand angle={minuteAngle} length={58} width={3} color="rgba(255,255,255,0.9)" />
      <ClockHand
        angle={secondAngle}
        length={64}
        width={1.5}
        color="#F51EA0"
        className="transition-transform duration-75 ease-linear"
      />

      <circle cx={CX} cy={CY} r="5" fill="#F51EA0" />
      <circle cx={CX} cy={CY} r="2.5" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

export function KioskClock() {
  const { settings } = useCompanySettings();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const cityLabel = timeZoneCityLabel(settings.timeZone);
  const parts = now ? getZonedTimeParts(now, settings.timeZone) : null;
  const timeLabel = now
    ? `${formatClockTime(now, settings.timeZone)}, ${formatClockDate(now, settings.timeZone)}`
    : 'Loading time';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[clamp(1.1rem,3.5vw,1.75rem)] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md max-md:landscape:mx-auto max-md:landscape:max-w-xs max-md:landscape:shadow-none md:landscape:justify-between md:landscape:px-[clamp(0.85rem,2.8vw,1.5rem)] md:landscape:py-[clamp(0.85rem,2.8vh,1.5rem)]">
      <div
        className="pointer-events-none absolute -top-1/4 left-1/2 hidden h-2/3 w-[130%] -translate-x-1/2 rounded-[50%] bg-primary/10 blur-3xl md:landscape:block"
        aria-hidden
      />

      <div
        className="relative flex h-full w-full flex-col md:landscape:justify-between"
        aria-live="polite"
        aria-atomic="true"
        aria-label={timeLabel}
      >
        <p className="shrink-0 text-[clamp(0.55rem,1.3vh,0.68rem)] font-semibold uppercase tracking-[0.32em] text-primary/80">
          {cityLabel} Time
        </p>
        <h2
          className="mt-[clamp(0.1rem,0.5vh,0.35rem)] hidden text-center text-[clamp(1.1rem,2.8vh,1.6rem)] font-bold text-white md:landscape:block md:landscape:opacity-0"
          aria-hidden
        >
          .
        </h2>

        {/* Analog clock — landscape split layout */}
        <div className="relative mx-auto mt-[clamp(0.35rem,1.4vh,0.9rem)] hidden aspect-square w-[min(100%,clamp(9rem,24vh,15rem))] md:landscape:mt-0 md:landscape:block md:landscape:flex-1 md:landscape:max-h-[min(28vh,16rem)] md:landscape:w-auto md:landscape:self-center">
          {parts ? (
            <AnalogClockFace
              hour={parts.hour}
              minute={parts.minute}
              second={parts.second}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-white/5">
              <div className="h-[70%] w-[70%] animate-pulse rounded-full bg-white/10" />
            </div>
          )}
        </div>

        {/* Digital clock — mobile & portrait */}
        {now ? (
          <div className="mt-1.5 shrink-0 md:landscape:hidden">
            <p className="whitespace-nowrap font-semibold leading-none tabular-nums tracking-tight text-white text-[clamp(1.45rem,4.8vh,2rem)]">
              {formatClockTime(now, settings.timeZone, { showSeconds: false })}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
              {formatClockDate(now, settings.timeZone)}
            </p>
          </div>
        ) : (
          <div className="mt-2 flex shrink-0 flex-col items-center gap-2 md:landscape:hidden" aria-hidden>
            <div className="h-7 w-32 animate-pulse rounded-lg bg-white/10" />
            <div className="h-2 w-40 animate-pulse rounded bg-white/5" />
          </div>
        )}

        {/* Digital readout — landscape footer */}
        {now ? (
          <div className="mt-[clamp(0.45rem,1.4vh,0.85rem)] hidden shrink-0 md:landscape:block">
            <p className="whitespace-nowrap font-semibold tabular-nums tracking-tight text-white text-[clamp(0.95rem,2.2vh,1.25rem)]">
              {formatClockTime(now, settings.timeZone, { showSeconds: true })}
            </p>
            <p className="mt-[clamp(0.2rem,0.6vh,0.4rem)] text-[clamp(0.55rem,1.2vh,0.7rem)] font-medium uppercase tracking-[0.2em] text-zinc-500">
              {formatClockDate(now, settings.timeZone)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
