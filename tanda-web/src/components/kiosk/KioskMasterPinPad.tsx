'use client';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

interface KioskMasterPinPadProps {
  pin: string;
  maxLength?: number;
  loading?: boolean;
  submitLabel?: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function KioskMasterPinPad({
  pin,
  maxLength = 12,
  loading = false,
  submitLabel = 'Authorize device',
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KioskMasterPinPadProps) {
  const masked = '•'.repeat(pin.length);

  return (
    <div className="w-full max-w-sm">
      <div className="flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 md:h-12 md:px-4">
        <span className="font-mono text-base tracking-[0.25em] text-white md:text-xl md:tracking-[0.3em]">
          {masked || '—'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 md:mt-4 md:gap-3">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading || pin.length >= maxLength}
            onClick={() => onDigit(key)}
            className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:bg-white/15 active:scale-95 disabled:opacity-50 md:h-14 md:rounded-xl md:text-2xl"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={onClear}
          className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50 md:h-14 md:rounded-xl md:text-lg"
        >
          C
        </button>
        <button
          type="button"
          disabled={loading || pin.length >= maxLength}
          onClick={() => onDigit('0')}
          className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:bg-white/15 disabled:opacity-50 md:h-14 md:rounded-xl md:text-2xl"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onBackspace}
          className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-base font-semibold text-white transition hover:bg-white/15 disabled:opacity-50 md:h-14 md:rounded-xl md:text-xl"
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        disabled={loading || !pin}
        onClick={onSubmit}
        className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:mt-5 md:h-12 md:text-sm"
      >
        {loading ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white md:h-5 md:w-5" />
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
