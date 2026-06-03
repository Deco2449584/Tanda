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
    <div className="w-full max-w-[640px] rounded-3xl border border-blue-300/25 bg-white/5 px-5 py-6 shadow-xl backdrop-blur-sm md:px-8 md:py-8">
      <h1 className="text-center text-3xl font-bold tracking-tight text-white md:text-5xl">
        WELCOME
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-300 md:text-base">
        Enter your PIN
      </p>

      <div
        className="mx-auto mt-5 flex h-14 w-[min(100%,460px)] items-center justify-center rounded-full border border-white/15 bg-white/10 md:h-[66px]"
        aria-label="PIN entry"
      >
        <span className="font-mono text-2xl font-bold tracking-[0.35em] text-emerald-50 md:text-[34px]">
          {display}
        </span>
      </div>
      <p className="mt-2 text-center text-xs tracking-widest text-slate-400">
        EMPLOYEE PIN
      </p>

      <div className="mx-auto mt-5 grid w-[min(100%,470px)] grid-cols-3 gap-3 md:gap-4">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => onDigit(key)}
            className="flex h-16 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-3xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-[82px] md:text-4xl"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={onClear}
          className="flex h-16 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-[82px]"
        >
          C
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onDigit('0')}
          className="flex h-16 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-3xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-[82px] md:text-4xl"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={onBackspace}
          className="flex h-16 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl font-semibold text-white transition active:scale-95 hover:bg-white/15 disabled:opacity-50 md:h-[82px]"
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <button
        type="button"
        disabled={loading || !pin}
        onClick={onSubmit}
        className="mx-auto mt-6 flex h-14 w-[min(100%,470px)] items-center justify-center rounded-full border border-blue-300/35 bg-blue-600 text-lg font-bold tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 md:h-[74px] md:text-xl"
      >
        {loading ? (
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          'CONTINUE'
        )}
      </button>
    </div>
  );
}
