'use client';

import type { KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { ShiftCard } from '@/components/schedule/ShiftCard';
import type { WeekDay } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';

interface ScheduleMobileWeekProps {
  employees: Employee[];
  weekDays: WeekDay[];
  shiftsByCell: Map<string, Shift[]>;
  employeesByCode: Map<string, Employee>;
  onCellClick: (employee: Employee, date: string) => void;
  onDeleteShift: (shift: Shift, employeeName: string) => void;
}

function shiftKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

export function ScheduleMobileWeek({
  employees,
  weekDays,
  shiftsByCell,
  employeesByCode,
  onCellClick,
  onDeleteShift,
}: ScheduleMobileWeekProps) {
  if (employees.length === 0) {
    return (
      <p className="px-3 py-10 text-center text-sm text-zinc-500">
        No employees to show this week.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80">
      {employees.map((employee) => (
        <li key={employee.id} className="px-3 py-2">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{employee.name}</p>
            <p className="shrink-0 font-mono text-[10px] text-zinc-500">
              {employee.employeeId}
            </p>
          </div>

          <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-0.5 scrollbar-hide">
            {weekDays.map((day) => {
              const cellShifts =
                shiftsByCell.get(shiftKey(employee.employeeId, day.date)) ?? [];
              const hasShift = cellShifts.length > 0;
              const visibleShifts = cellShifts.slice(0, 2);
              const hiddenCount = cellShifts.length - visibleShifts.length;

              function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>) {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onCellClick(employee, day.date);
                }
              }

              return (
                <div
                  key={`${employee.id}-${day.date}`}
                  className="w-[3.4rem] shrink-0"
                >
                  <div className="mb-0.5 text-center leading-none">
                    <p className="text-[9px] font-semibold text-zinc-400">{day.label}</p>
                    <p className="text-[8px] text-zinc-600">{day.date.slice(5)}</p>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onCellClick(employee, day.date)}
                    onKeyDown={handleCellKeyDown}
                    className="flex min-h-[3.25rem] cursor-pointer flex-col justify-center rounded-md border border-zinc-800/80 bg-zinc-950/50 p-0.5 transition-colors hover:border-zinc-600 hover:bg-zinc-800/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {hasShift ? (
                      <div className="space-y-0.5">
                        {visibleShifts.map((shift) => (
                          <ShiftCard
                            key={shift.id}
                            shift={shift}
                            employeeName={employee.name}
                            compact
                            onDelete={(shiftToDelete) =>
                              onDeleteShift(
                                shiftToDelete,
                                employeesByCode.get(shiftToDelete.employeeId)?.name ??
                                  employee.name,
                              )
                            }
                          />
                        ))}
                        {hiddenCount > 0 ? (
                          <p className="text-center text-[8px] font-medium text-zinc-500">
                            +{hiddenCount}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[2.5rem] items-center justify-center text-zinc-600">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
