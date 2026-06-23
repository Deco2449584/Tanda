interface WeeklyHoursCardProps {
  hours: number;
  goal?: number;
  loading?: boolean;
}

export function WeeklyHoursCard({
  hours,
  goal = 40,
  loading = false,
}: WeeklyHoursCardProps) {
  const roundedHours = Math.round(hours * 10) / 10;
  const progress = goal > 0 ? Math.min((roundedHours / goal) * 100, 100) : 0;

  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            Total weekly hours
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {loading ? (
              <span className="inline-block animate-pulse text-subtle">...</span>
            ) : (
              `${roundedHours} hrs`
            )}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-subtle">
        Progress goal {goal} hrs
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: loading ? '0%' : `${progress}%` }}
        />
      </div>
    </article>
  );
}
