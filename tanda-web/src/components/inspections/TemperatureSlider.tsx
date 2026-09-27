'use client';

import type { CSSProperties } from 'react';
import {
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
  temperatureColor,
  temperatureRatio,
} from '@/lib/inspections/temperature-color';

export function TemperatureSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const display = value ?? 4;
  const tone = temperatureColor(display);

  function setFromInput(raw: string) {
    const cleaned = raw.replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.') {
      onChange(null);
      return;
    }
    const next = Number(cleaned);
    if (!Number.isFinite(next)) {
      onChange(null);
      return;
    }
    onChange(Math.max(TEMPERATURE_MIN, Math.min(TEMPERATURE_MAX, Math.round(next))));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">Temperature (°C)</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={value == null ? '' : String(value)}
            onChange={(event) => setFromInput(event.target.value)}
            placeholder="—"
            className="h-8 w-[72px] rounded-[10px] border border-border-strong bg-surface-base px-2 text-right text-sm font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm font-semibold" style={{ color: tone }}>
            °C
          </span>
        </div>
      </div>
      <input
        type="range"
        min={TEMPERATURE_MIN}
        max={TEMPERATURE_MAX}
        step={1}
        value={display}
        onChange={(event) => onChange(Number(event.target.value))}
        className="inspection-temp-slider w-full"
        style={{ '--temp-ratio': String(temperatureRatio(display)), '--temp-color': tone } as CSSProperties}
        aria-label="Temperature in Celsius"
      />
      <p className="text-[11px] text-subtle">
        {value == null ? 'Optional — slide or type a reading.' : `${value} °C`}
      </p>
    </div>
  );
}
