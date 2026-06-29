'use client';

interface MonthlyHoursCardProps {
  hours: number;
  goal?: number;
  loading?: boolean;
  embedded?: boolean;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MonthlyHoursCard({
  hours,
  goal = 200,
  loading = false,
  embedded = false,
}: MonthlyHoursCardProps) {
  const roundedHours = Math.round(hours * 10) / 10;
  const progress = goal > 0 ? Math.min(roundedHours / goal, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={embedded ? '' : 'rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm'}>
      {!embedded ? (
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          Total monthly hours
        </p>
      ) : null}

      <div className={`flex items-center justify-between gap-4 ${embedded ? '' : 'mt-3'}`}>
        <div>
          <p className={`font-bold text-white ${embedded ? 'text-2xl' : 'text-3xl'}`}>
            {loading ? (
              <span className="inline-block animate-pulse text-subtle">...</span>
            ) : (
              `${roundedHours} hrs`
            )}
          </p>
          <p className="mt-2 text-xs text-subtle">Current month</p>
        </div>

        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="#27272a"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={loading ? CIRCUMFERENCE : strokeDashoffset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-sky-300">
            {loading ? '—' : `${Math.round(progress * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}