'use client';

import {
  COUNT_UNITS,
  getCountUnitLabel,
  type CargoCountUnit,
} from '@/lib/inspections/count-unit';

export function CountUnitPills({
  value,
  onChange,
}: {
  value: CargoCountUnit;
  onChange: (unit: CargoCountUnit) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-foreground">Quantity unit</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {COUNT_UNITS.map((unit) => {
          const selected = unit === value;
          return (
            <button
              key={unit}
              type="button"
              onClick={() => onChange(unit)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition ${
                selected
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-transparent bg-surface-hover text-muted hover:border-primary/40'
              }`}
            >
              {getCountUnitLabel(unit)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
