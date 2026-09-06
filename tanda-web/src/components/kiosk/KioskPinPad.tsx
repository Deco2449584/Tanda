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
  'flex items-center justify-center rounded-[clamp(0.75rem,2vw,1.1rem)] border border-white/10 ' +
  'bg-white/[0.06] font-semibold tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ' +
  'transition hover:bg-white/[0.12] active:scale-95 disabled:opacity-40 disabled:active:scale-100 ' +
  'h-[clamp(2.5rem,6.2vh,3.75rem)] text-[clamp(1.05rem,2.8vh,1.75rem)]';

const iconClass = 'h-[clamp(1rem,2.2vh,1.4rem)] w-[clamp(1rem,2.2vh,1.4rem)]';

export function KioskPinPad({
  pin,
  loading,
  maxLength = 4,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KioskPinPadProps) {
  const atMax = pin.length >= maxLength;
  const slots = Array.from({ length: maxLength });

  return (
    <div className="flex h-full w-full flex-col gap-[clamp(0.85rem,2.2vh,1.35rem)] rounded-[clamp(1.1rem,3.5vw,1.75rem)] border border-white/10 bg-white/[0.03] p-[clamp(0.85rem,2.8vw,1.5rem)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md md:landscape:justify-between">
      <div className="shrink-0">
        <p className="text-center text-[clamp(0.55rem,1.3vh,0.68rem)] font-semibold uppercase tracking-[0.32em] text-primary/80">
          Time Clock
        </p>
        <h2 className="mt-[clamp(0.1rem,0.5vh,0.35rem)] text-center text-[clamp(1.1rem,2.8vh,1.6rem)] font-bold text-white">
          Enter your ID
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-[clamp(0.75rem,2vh,1.2rem)]">
        <div
          className="flex shrink-0 items-center justify-center gap-[clamp(0.45rem,1.8vw,0.75rem)]"
          aria-label="ID entry"
        >
          {slots.map((_, index) => {
            const filled = index < pin.length;
            const active = index === pin.length && pin.length < maxLength;

            return (
              <div
                key={index}
                className={cn(
                  'flex aspect-[5/6] w-[clamp(2.15rem,9.5vw,3.15rem)] items-center justify-center rounded-[clamp(0.6rem,1.8vw,1rem)] border transition',
                  active
                    ? 'border-primary bg-primary/15 ring-2 ring-primary/60'
                    : filled
                      ? 'border-white/20 bg-white/[0.08]'
                      : 'border-white/10 bg-white/[0.03]',
                )}
              >
                {filled && (
                  <span className="h-[clamp(0.5rem,1.4vh,0.7rem)] w-[clamp(0.5rem,1.4vh,0.7rem)] rounded-full bg-white" />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-[clamp(0.4rem,1.6vw,0.7rem)]">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={loading || atMax}
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
            disabled={loading || atMax}
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
        className="flex h-[clamp(2.6rem,5.8vh,3.4rem)] w-full shrink-0 items-center justify-center gap-2 rounded-[clamp(0.85rem,2.5vw,1.2rem)] bg-primary text-[clamp(0.9rem,2.2vh,1.1rem)] font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
      >
        {loading ? (
          <span className="inline-block h-[clamp(1rem,2.2vh,1.35rem)] w-[clamp(1rem,2.2vh,1.35rem)] animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
