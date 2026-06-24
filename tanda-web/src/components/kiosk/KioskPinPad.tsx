'use client';

import { ArrowRight, Delete, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface KioskPinPadProps {
  pin: string;
  loading: boolean;
  maxLength?: number;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

const keyClass =
  'flex items-center justify-center rounded-[clamp(0.85rem,2.5vw,1.25rem)] border border-white/10 ' +
  'bg-white/[0.06] font-semibold tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ' +
  'transition hover:bg-white/[0.12] active:scale-95 disabled:opacity-40 disabled:active:scale-100 ' +
  'h-[clamp(2.85rem,7.2vh,4.5rem)] text-[clamp(1.15rem,3.2vh,2rem)]';

const iconClass = 'h-[clamp(1.1rem,2.6vh,1.6rem)] w-[clamp(1.1rem,2.6vh,1.6rem)]';

export function KioskPinPad({
  pin,
  loading,
  maxLength = 8,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KioskPinPadProps) {
  const visibleSlots = Math.min(maxLength, Math.max(4, pin.length + 1));
  const slots = Array.from({ length: visibleSlots });

  return (
    <div className="flex h-full w-full flex-col rounded-[clamp(1.25rem,4vw,2rem)] border border-white/10 bg-white/[0.03] p-[clamp(1rem,3.5vw,1.75rem)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md lg:landscape:justify-between">
      <div className="shrink-0">
        <p className="text-center text-[clamp(0.58rem,1.5vh,0.7rem)] font-semibold uppercase tracking-[0.32em] text-primary/80">
          Time Clock
        </p>
        <h2 className="mt-[clamp(0.15rem,0.6vh,0.4rem)] text-center text-[clamp(1.2rem,3.2vh,1.75rem)] font-bold text-white">
          Enter your ID
        </h2>
      </div>

      <div className="mt-[clamp(0.85rem,2.4vh,1.4rem)] lg:landscape:mt-0 lg:landscape:flex lg:landscape:flex-1 lg:landscape:flex-col lg:landscape:justify-center">
      <div
        className="flex items-center justify-center gap-[clamp(0.5rem,2vw,0.85rem)]"
        aria-label="ID entry"
      >
        {slots.map((_, index) => {
          const filled = index < pin.length;
          const active = index === pin.length && pin.length < maxLength;

          return (
            <div
              key={index}
              className={cn(
                'flex aspect-[5/6] w-[clamp(2.4rem,11vw,3.5rem)] items-center justify-center rounded-[clamp(0.7rem,2vw,1.1rem)] border transition',
                active
                  ? 'border-primary bg-primary/15 ring-2 ring-primary/60'
                  : filled
                    ? 'border-white/20 bg-white/[0.08]'
                    : 'border-white/10 bg-white/[0.03]',
              )}
            >
              {filled && (
                <span className="h-[clamp(0.55rem,1.6vh,0.8rem)] w-[clamp(0.55rem,1.6vh,0.8rem)] rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-[clamp(0.85rem,2.4vh,1.4rem)] grid grid-cols-3 gap-[clamp(0.5rem,2vw,0.85rem)]">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => onDigit(key)}
            className={keyClass}
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={onClear}
          className={keyClass}
          aria-label="Clear"
        >
          <RotateCcw className={iconClass} strokeWidth={2} />
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onDigit('0')}
          className={keyClass}
        >
          0
        </button>

        <button
          type="button"
          disabled={loading || pin.length === 0}
          onClick={onBackspace}
          className={keyClass}
          aria-label="Backspace"
        >
          <Delete className={iconClass} strokeWidth={2} />
        </button>
      </div>
      </div>

      <button
        type="button"
        disabled={loading || !pin}
        onClick={onSubmit}
        className="mt-[clamp(0.85rem,2.5vh,1.4rem)] flex h-[clamp(2.85rem,6.5vh,3.75rem)] w-full shrink-0 items-center justify-center gap-2 rounded-[clamp(0.9rem,3vw,1.35rem)] bg-primary text-[clamp(0.95rem,2.4vh,1.15rem)] font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none lg:landscape:mt-0"
      >
        {loading ? (
          <span className="inline-block h-[clamp(1.1rem,2.6vh,1.5rem)] w-[clamp(1.1rem,2.6vh,1.5rem)] animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            Continue
            <ArrowRight className={iconClass} strokeWidth={2.25} />
          </>
        )}
      </button>
    </div>
  );
}
