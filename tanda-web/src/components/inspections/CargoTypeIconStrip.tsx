'use client';

import { CARGO_UNIT_TYPES, getUnitTypeIcon, getUnitTypeLabel } from '@/lib/inspections/cargo-unit-type';
import type { CargoUnitType } from '@/lib/types/cargo-inspection';

export function CargoTypeIconStrip({
  value,
  onChange,
}: {
  value: CargoUnitType;
  onChange: (unitType: CargoUnitType) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">Cargo type</p>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {CARGO_UNIT_TYPES.map((unitType) => {
          const Icon = getUnitTypeIcon(unitType);
          const selected = unitType === value;
          return (
            <button
              key={unitType}
              type="button"
              onClick={() => onChange(unitType)}
              className={`flex w-[88px] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition ${
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-strong bg-surface-base text-muted hover:border-primary/40'
              }`}
            >
              <Icon className="h-6 w-6" aria-hidden />
              <span className="text-[11px] font-semibold leading-tight">
                {getUnitTypeLabel(unitType)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
