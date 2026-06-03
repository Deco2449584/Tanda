'use client';

interface KioskPinPadProps {
  pin: string;
  loading: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function KioskPinPad({
  pin,
  loading,
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
}: KioskPinPadProps) {
  const display = pin.padEnd(8, '•').slice(0, 8);

  return (
    <div className="w-full max-w-[640px] shrink-0 rounded-2xl border border-primary/25 bg-white/5 px-3 py-3 shadow-xl backdrop-blur-sm md:rounded-3xl md:px-8 md:py-8">
     
      <p className="mt-1 text-center text-xs text-zinc-300 md:mt-2 md:text-base">
        Enter your PIN
      </p>

      <div
        className="mx-auto mt-3 flex h-10 w-full max-w-[460px] items-center justify-center rounded-full border border-white/15 bg-white/10 md:mt-5 md:h-[66px]"
        aria-label="PIN entry"
      >
        <span className="font-mono text-lg font-bold tracking-[0.3em] text-emerald-50 md:text-[34px] md:tracking-[0.35em]">
          {display}
        </span>
      </div>
      <p className="mt-1 text-center text-[10px] tracking-widest text-slate-400 md:mt-2 md:text-xs">
        EMPLOYEE PIN
      </p>

      <div className="mx-auto mt-3 grid w-full max-w-[470px] grid-cols-3 gap-2 md:mt-5 md:gap-4">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => onDigit(key)}
            className="flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-20 md:rounded-xl md:text-4xl"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={onClear}
          className="flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-base font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-20 md:rounded-xl md:text-xl"
        >
          C
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onDigit('0')}
          className="flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-20 md:rounded-xl md:text-4xl"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onBackspace}
          className="flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-lg font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-20 md:rounded-xl md:text-2xl"
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        disabled={loading || !pin}
        onClick={onSubmit}
        className="mx-auto mt-3 flex h-11 w-full max-w-[470px] items-center justify-center rounded-full bg-primary text-base font-bold tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:mt-6 md:h-[74px] md:text-xl"
      >
        {loading ? (
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white md:h-6 md:w-6" />
        ) : (
          'CONTINUE'
        )}
      </button>
    </div>
  );
}
