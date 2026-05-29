import { BarChart3 } from 'lucide-react';

const WEEKLY_HOURS = 38.5;
const WEEKLY_GOAL = 40;

export function WeeklyHoursCard() {
  const progress = Math.min((WEEKLY_HOURS / WEEKLY_GOAL) * 100, 100);

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Horas totales semanales
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{WEEKLY_HOURS} hrs</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Meta de progreso {WEEKLY_GOAL} hrs
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}
