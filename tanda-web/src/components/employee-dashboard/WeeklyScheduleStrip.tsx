import { formatShiftBlockLabel } from '@/lib/employee-dashboard/format';
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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-white">
        Mi horario semanal actual
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Cargando horario...</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {weekDays.map((day) => {
            const shift = shiftsByDate[day.date];

            if (!shift) {
              return (
                <div
                  key={day.date}
                  className="flex min-h-[100px] flex-col rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <p className="text-xs font-semibold text-zinc-500">{day.label}</p>
                  <p className="mt-auto text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600">
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
                className={`flex min-h-[100px] flex-col rounded-xl border p-3 ${
                  isCompleted
                    ? 'border-emerald-500/40 bg-emerald-600/25'
                    : isScheduled
                      ? 'border-blue-500/40 bg-blue-600/25'
                      : 'border-orange-500/40 bg-orange-600/20'
                }`}
              >
                <p className="text-xs font-semibold text-zinc-300">{day.label}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-100">
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
