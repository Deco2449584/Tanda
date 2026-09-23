'use client';

import type { CSSProperties } from 'react';

export function MetricSlider({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const safeValue = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
  const ratio = max === 0 ? 0 : safeValue / max;

  function setFromInput(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) {
      onChange(0);
      return;
    }
    const next = Number(digits);
    onChange(Math.max(0, Math.min(max, Number.isFinite(next) ? next : 0)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={String(safeValue)}
            onChange={(event) => setFromInput(event.target.value)}
            className="h-8 w-[72px] rounded-[10px] border border-border-strong bg-surface-base px-2 text-right text-sm font-semibold text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm font-semibold text-foreground">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={safeValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="inspection-metric-slider w-full"
        style={{ '--metric-ratio': String(ratio) } as CSSProperties}
        aria-label={label}
      />
    </div>
  );
}
