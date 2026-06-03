'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { ShiftCard } from '@/components/schedule/ShiftCard';
import { ShiftDeleteConfirmModal } from '@/components/schedule/ShiftDeleteConfirmModal';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { normalizeInputDate } from '@/lib/dates/input-date';
import type { WeekDay } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';

interface ScheduleGridProps {
  employees: Employee[];
  shifts: Shift[];
  weekDays: WeekDay[];
  loading: boolean;
  onCellClick: (employee: Employee, date: string) => void;
}

function shiftKey(employeeId: string, date: string) {
  return `${employeeId}__${date}`;
}

export function ScheduleGrid({
  employees,
  shifts,
  weekDays,
  loading,
  onCellClick,
}: ScheduleGridProps) {
  const [pendingDelete, setPendingDelete] = useState<{
    shift: Shift;
    employeeName: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>();

    shifts.forEach((shift) => {
      const key = shiftKey(
        shift.employeeId,
        normalizeInputDate(shift.date),
      );
      const existing = map.get(key) ?? [];
      existing.push(shift);
      map.set(key, existing);
    });

    return map;
  }, [shifts]);

  const employeesByCode = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => {
      map.set(employee.employeeId, employee);
    });
    return map;
  }, [employees]);

  async function handleConfirmDelete() {
    if (!db || !pendingDelete) return;

    setDeletingId(pendingDelete.shift.id);

    try {
      await deleteDoc(doc(db, COLLECTIONS.SHIFTS, pendingDelete.shift.id));
      setPendingDelete(null);
    } catch {
      window.alert('Could not delete the shift.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
        <p className="text-sm text-zinc-400">Loading schedule...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="min-w-[900px]">
            <div className="sticky top-0 z-10 grid grid-cols-8 border-b border-zinc-800 bg-zinc-950">
              <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Employee
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className="border-l border-zinc-800/80 px-2 py-3 text-center"
                >
                  <p className="text-xs font-semibold text-zinc-200">{day.label}</p>
                  <p className="text-[10px] text-zinc-500">{day.date.slice(5)}</p>
                </div>
              ))}
            </div>

            {employees.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-zinc-500">
                No employees to show this week.
              </div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-8 border-b border-zinc-800/60"
                >
                  <div className="border-r border-zinc-800/60 bg-zinc-950/30 px-3 py-3">
                    <p className="text-sm font-semibold text-white">{employee.name}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      ({employee.employeeId} {employee.department})
                    </p>
                  </div>

                  {weekDays.map((day) => {
                    const cellShifts =
                      shiftsByCell.get(shiftKey(employee.employeeId, day.date)) ??
                      [];
                    const hasShift = cellShifts.length > 0;

                    function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>) {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onCellClick(employee, day.date);
                      }
                    }

                    return (
                      <div
                        key={`${employee.id}-${day.date}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onCellClick(employee, day.date)}
                        onKeyDown={handleCellKeyDown}
                        className="group min-h-[88px] cursor-pointer border-l border-zinc-800/60 bg-zinc-950/20 p-1.5 text-left transition-colors hover:bg-zinc-800/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        {hasShift ? (
                          <div
                            className="space-y-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {cellShifts.map((shift) => (
                              <ShiftCard
                                key={shift.id}
                                shift={shift}
                                employeeName={employee.name}
                                employeePhotoUrl={employee.photoUrl}
                                onDelete={(shiftToDelete) =>
                                  setPendingDelete({
                                    shift: shiftToDelete,
                                    employeeName:
                                      employeesByCode.get(shiftToDelete.employeeId)
                                        ?.name ?? employee.name,
                                  })
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[72px] items-center justify-center rounded-md border border-dashed border-zinc-700/80 text-zinc-500 group-hover:border-zinc-500 group-hover:text-zinc-300">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                        {hasShift ? (
                          <p className="pointer-events-none mt-1 text-center text-[9px] font-medium uppercase tracking-wide text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                            + Add shift
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ShiftDeleteConfirmModal
        shift={pendingDelete?.shift ?? null}
        employeeName={pendingDelete?.employeeName ?? ''}
        loading={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
