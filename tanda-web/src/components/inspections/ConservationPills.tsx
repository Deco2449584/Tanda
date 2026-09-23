'use client';

import {
  CONSERVATION_COLORS,
  CONSERVATION_ICONS,
} from '@/lib/inspections/normalize-conservation';
import { CONSERVATION_TYPES, type ConservationType } from '@/lib/types/cargo-inspection';

export function ConservationPills({
  value,
  onChange,
}: {
  value: ConservationType;
  onChange: (value: ConservationType) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-foreground">Conservation type</p>
      <div className="flex flex-wrap gap-2">
        {CONSERVATION_TYPES.map((type) => {
          const selected = type === value;
          const tone = CONSERVATION_COLORS[type];
          const Icon = CONSERVATION_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-2 text-[13px] font-semibold transition ${
                selected
                  ? ''
                  : 'border-transparent bg-surface-hover text-foreground hover:border-primary/40'
              }`}
              style={
                selected
                  ? {
                      backgroundColor: tone.bg,
                      borderColor: tone.text,
                      color: tone.text,
                    }
                  : undefined
              }
            >
              <Icon className="h-4 w-4" style={{ color: tone.text }} aria-hidden />
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
