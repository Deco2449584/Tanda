import { formatShiftBlockLabel } from '@/lib/employee-dashboard/format';
import { normalizeInputDate } from '@/lib/dates/input-date';
import type { WeekDay } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

interface WeeklyScheduleStripProps {
  weekDays: WeekDay[];
  shiftsByDate: Record<string, Shift>;
  loading: boolean;
}

export function WeeklyScheduleStrip({
  weekDays,
  shiftsByDate,
  loading,
}: WeeklyScheduleStripProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm md:p-5">
      <h2 className="text-sm font-semibold text-white">
        Mi horario semanal actual
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Cargando horario...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {weekDays.map((day) => {
            const shift = shiftsByDate[normalizeInputDate(day.date)];

            if (!shift) {
              return (
                <div
                  key={day.date}
                  className="flex min-h-[72px] items-center justify-between rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-zinc-400">{day.label}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                    Día libre
                  </p>
                </div>
              );
            }

            const isCompleted = shift.status === 'completed';
            const isScheduled = shift.status === 'scheduled';

            return (
              <div
                key={day.date}
                className={`rounded-xl border px-4 py-3 ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-600/25'
                    : isScheduled
                      ? 'border-blue-500/40 bg-blue-600/25'
                      : 'border-orange-500/40 bg-orange-600/20'
                }`}
              >
                <p className="text-sm font-semibold text-zinc-200">{day.label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-100">
                  {formatShiftBlockLabel(
                    shift.date,
                    shift.startTime,
                    shift.endTime,
                    isCompleted ? 'completed' : 'scheduled',
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
