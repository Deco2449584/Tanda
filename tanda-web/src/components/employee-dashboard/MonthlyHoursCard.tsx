interface MonthlyHoursCardProps {
  hours: number;
  goal?: number;
  loading?: boolean;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function MonthlyHoursCard({
  hours,
  goal = 200,
  loading = false,
}: MonthlyHoursCardProps) {
  const roundedHours = Math.round(hours * 10) / 10;
  const progress = goal > 0 ? Math.min(roundedHours / goal, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Horas totales mensuales
      </p>

      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-bold text-white">
            {loading ? (
              <span className="inline-block animate-pulse text-zinc-500">...</span>
            ) : (
              `${roundedHours} hrs`
            )}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Mes en curso</p>
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
              stroke="#10b981"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={loading ? CIRCUMFERENCE : strokeDashoffset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-emerald-400">
            {loading ? '—' : `${Math.round(progress * 100)}%`}
          </span>
        </div>
      </div>
    </article>
  );
}
