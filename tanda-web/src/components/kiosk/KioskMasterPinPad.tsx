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
      <div className="flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4">
        <span className="font-mono text-xl tracking-[0.3em] text-white">
          {masked || '—'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading || pin.length >= maxLength}
            onClick={() => onDigit(key)}
            className="flex h-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl font-semibold text-white transition hover:bg-white/15 active:scale-95 disabled:opacity-50"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={onClear}
          className="flex h-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          C
        </button>
        <button
          type="button"
          disabled={loading || pin.length >= maxLength}
          onClick={() => onDigit('0')}
          className="flex h-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onBackspace}
          className="flex h-14 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        disabled={loading || !pin}
        onClick={onSubmit}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-full border border-blue-300/35 bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
