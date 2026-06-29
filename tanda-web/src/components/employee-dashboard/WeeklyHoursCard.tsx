interface WeeklyHoursCardProps {
  hours: number;
  goal?: number;
  loading?: boolean;
  embedded?: boolean;
}

export function WeeklyHoursCard({
  hours,
  goal = 40,
  loading = false,
  embedded = false,
}: WeeklyHoursCardProps) {
  const roundedHours = Math.round(hours * 10) / 10;
  const progress = goal > 0 ? Math.min((roundedHours / goal) * 100, 100) : 0;

  return (
    <div className={embedded ? '' : 'rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm'}>
      {!embedded ? (
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          Total weekly hours
        </p>
      ) : null}

      <div className={embedded ? '' : 'mt-2 flex items-start justify-between gap-3'}>
        <p className={`font-bold text-white ${embedded ? 'text-2xl' : 'text-3xl'}`}>
          {loading ? (
            <span className="inline-block animate-pulse text-subtle">...</span>
          ) : (
            `${roundedHours} hrs`
          )}
        </p>
      </div>

      <p className={`text-xs text-subtle ${embedded ? 'mt-3' : 'mt-4'}`}>
        Progress goal {goal} hrs
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: loading ? '0%' : `${progress}%` }}
        />
      </div>
    </div>
  );
}