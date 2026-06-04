'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { isToday, parseISO } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import {
  formatShiftTimeRangeShort,
  type WeekDay,
} from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';

interface ScheduleMobileWeekProps {
  employees: Employee[];
  weekDays: WeekDay[];
  shifts: Shift[];
  shiftsByCell: Map<string, Shift[]>;
  employeesByCode: Map<string, Employee>;
  onCellClick: (employee: Employee, date: string) => void;
  onDeleteShift: (shift: Shift, employeeName: string) => void;
}

function shiftKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

const SHIFT_PILL_CLASS: Record<Shift['status'], string> = {
  scheduled:
    'border-primary/35 bg-primary/15 text-primary',
  completed:
    'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
  absent:
    'border-orange-500/35 bg-orange-500/10 text-orange-400',
};

function dayNumberFromDate(date: string): number {
  return Number(date.slice(8, 10));
}

interface MobileDayCellProps {
  date: string;
  shifts: Shift[];
  employee: Employee;
  employeesByCode: Map<string, Employee>;
  onCellClick: (employee: Employee, date: string) => void;
  onDeleteShift: (shift: Shift, employeeName: string) => void;
}

function MobileDayCell({
  date,
  shifts,
  employee,
  employeesByCode,
  onCellClick,
  onDeleteShift,
}: MobileDayCellProps) {
  const today = isToday(parseISO(`${date}T12:00:00`));
  const hasShift = shifts.length > 0;
  const primaryShift = shifts[0];

  function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onCellClick(employee, date);
    }
  }

  const cellSizeClass = 'h-[2.85rem] min-h-[2.85rem] w-full';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCellClick(employee, date)}
      onKeyDown={handleCellKeyDown}
      className={`relative flex ${cellSizeClass} flex-col items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        today && !hasShift ? 'ring-1 ring-primary/45 bg-primary/5' : ''
      } ${
        today && hasShift ? 'ring-1 ring-primary/45' : ''
      } ${
        hasShift && primaryShift
          ? SHIFT_PILL_CLASS[primaryShift.status]
          : 'border-dashed border-zinc-700/70 bg-zinc-950/40 hover:border-zinc-500 hover:bg-zinc-900/60'
      }`}
    >
      {hasShift && primaryShift ? (
        <>
          <span className="max-w-full truncate px-0.5 text-center text-[9px] font-bold leading-tight">
            {formatShiftTimeRangeShort(
              primaryShift.startTime,
              primaryShift.endTime,
            )}
          </span>
          {shifts.length > 1 ? (
            <span className="mt-0.5 text-[8px] font-medium opacity-80">
              +{shifts.length - 1}
            </span>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteShift(
                primaryShift,
                employeesByCode.get(primaryShift.employeeId)?.name ?? employee.name,
              );
            }}
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 shadow-sm hover:text-red-400"
            aria-label={`Delete shift for ${employee.name}`}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </>
      ) : (
        <Plus className="h-4 w-4 text-zinc-600" aria-hidden />
      )}
    </div>
  );
}

export function ScheduleMobileWeek({
  employees,
  weekDays,
  shifts,
  shiftsByCell,
  employeesByCode,
  onCellClick,
  onDeleteShift,
}: ScheduleMobileWeekProps) {
  const totalShifts = shifts.length;

  const shiftCountByEmployee = useMemo(() => {
    const counts = new Map<string, number>();
    shifts.forEach((shift) => {
      counts.set(shift.employeeId, (counts.get(shift.employeeId) ?? 0) + 1);
    });
    return counts;
  }, [shifts]);

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-12 text-center">
        <p className="text-sm font-medium text-zinc-300">No employees to schedule</p>
        <p className="mt-1 text-xs text-zinc-500">
          Adjust the department filter or add active staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
        <span>
          {totalShifts} shift{totalShifts === 1 ? '' : 's'} this week
        </span>
        <span>
          {employees.length} employee{employees.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50">
        <div className="grid grid-cols-7 gap-1 border-b border-zinc-800/80 bg-zinc-900/60 px-2 py-2">
          {weekDays.map((day) => {
            const today = isToday(parseISO(`${day.date}T12:00:00`));
            return (
              <div key={day.date} className="text-center">
                <p
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    today ? 'text-primary' : 'text-zinc-500'
                  }`}
                >
                  {day.label}
                </p>
                <p
                  className={`mt-0.5 text-xs font-bold tabular-nums ${
                    today
                      ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white'
                      : 'text-zinc-300'
                  }`}
                >
                  {dayNumberFromDate(day.date)}
                </p>
              </div>
            );
          })}
        </div>

        <p className="border-b border-zinc-800/60 px-3 py-1.5 text-[10px] text-zinc-600">
          Tap a day to assign or edit a shift
        </p>
      </div>

      <ul className="space-y-3">
        {employees.map((employee) => {
          const weekShiftCount =
            shiftCountByEmployee.get(employee.employeeId) ?? 0;

          return (
            <li key={employee.id}>
              <article className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 shadow-sm shadow-black/20">
                <div className="flex items-center gap-3 border-b border-zinc-800/60 px-3 py-2.5">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employee.photoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {employee.name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {employee.employeeId}
                      {employee.department ? ` · ${employee.department}` : ''}
                    </p>
                  </div>
                  {weekShiftCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                      {weekShiftCount}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] text-zinc-600">Off</span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1 p-2">
                  {weekDays.map((day) => (
                    <MobileDayCell
                      key={`${employee.id}-${day.date}`}
                      date={day.date}
                      shifts={
                        shiftsByCell.get(
                          shiftKey(employee.employeeId, day.date),
                        ) ?? []
                      }
                      employee={employee}
                      employeesByCode={employeesByCode}
                      onCellClick={onCellClick}
                      onDeleteShift={onDeleteShift}
                    />
                  ))}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
