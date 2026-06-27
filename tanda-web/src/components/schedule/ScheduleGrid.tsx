'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { ScheduleMobileWeek } from '@/components/schedule/ScheduleMobileWeek';
import { ScheduleStatusLegend } from '@/components/schedule/ScheduleStatusLegend';
import { ShiftCard } from '@/components/schedule/ShiftCard';
import { ShiftDeleteConfirmModal } from '@/components/schedule/ShiftDeleteConfirmModal';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { notifyShiftChange } from '@/lib/notifications/client-notify';
import { normalizeInputDate, isOnOrAfterToday } from '@/lib/dates/input-date';
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
      const { shift } = pendingDelete;

      await deleteDoc(doc(db, COLLECTIONS.SHIFTS, shift.id));

      void notifyShiftChange({
        type: 'cancelled',
        employeeId: shift.employeeId,
        date: normalizeInputDate(shift.date),
        startTime: shift.startTime,
        endTime: shift.endTime,
        department: shift.department,
      });

      setPendingDelete(null);
    } catch {
      window.alert('Could not delete the shift.');
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(shift: Shift, employeeName: string) {
    setPendingDelete({ shift, employeeName });
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-surface-raised md:min-h-[420px]">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 w-full flex-col">
      <ScheduleStatusLegend className="mb-3 shrink-0" />

      <div className="w-full md:hidden">
        <ScheduleMobileWeek
          employees={employees}
          shifts={shifts}
          weekDays={weekDays}
          shiftsByCell={shiftsByCell}
          employeesByCode={employeesByCode}
          onCellClick={onCellClick}
          onDeleteShift={requestDelete}
        />
      </div>

      <div className="hidden min-w-0 w-full overflow-hidden rounded-xl border border-border bg-surface-raised/40 backdrop-blur-sm md:block">
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="min-w-[900px]">
            <div className="sticky top-0 z-10 grid grid-cols-8 border-b border-border bg-surface-base">
              <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Employee
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  className="border-l border-border/80 px-2 py-3 text-center"
                >
                  <p className="text-xs font-semibold text-foreground">{day.label}</p>
                  <p className="text-[10px] text-subtle">{day.date.slice(5)}</p>
                </div>
              ))}
            </div>

            {employees.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-subtle">
                No employees to show this week.
              </div>
            ) : (
              employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-8 border-b border-border/60"
                >
                  <div className="border-r border-border/60 bg-surface-base/30 px-3 py-3">
                    <p className="text-sm font-semibold text-white">{employee.name}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">
                      ({employee.employeeId} {employee.department})
                    </p>
                  </div>

                  {weekDays.map((day) => {
                    const cellShifts =
                      shiftsByCell.get(shiftKey(employee.employeeId, day.date)) ??
                      [];
                    const hasShift = cellShifts.length > 0;
                    const canSchedule = isOnOrAfterToday(day.date);

                    function handleCellKeyDown(event: KeyboardEvent<HTMLDivElement>) {
                      if (!canSchedule) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onCellClick(employee, day.date);
                      }
                    }

                    return (
                      <div
                        key={`${employee.id}-${day.date}`}
                        role={canSchedule ? 'button' : undefined}
                        tabIndex={canSchedule ? 0 : undefined}
                        onClick={() => {
                          if (canSchedule) onCellClick(employee, day.date);
                        }}
                        onKeyDown={handleCellKeyDown}
                        className={`group min-h-[88px] border-l border-border/60 bg-surface-base/20 p-1.5 text-left transition-colors ${
                          canSchedule
                            ? 'cursor-pointer hover:bg-surface-hover/40 focus:outline-none focus:ring-1 focus:ring-primary/50'
                            : 'cursor-default opacity-70'
                        }`}
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
                                  requestDelete(
                                    shiftToDelete,
                                    employeesByCode.get(shiftToDelete.employeeId)
                                      ?.name ?? employee.name,
                                  )
                                }
                              />
                            ))}
                          </div>
                        ) : canSchedule ? (
                          <div className="flex h-full min-h-[72px] items-center justify-center rounded-md border border-dashed border-border-strong/80 text-subtle group-hover:border-zinc-500 group-hover:text-muted">
                            <Plus className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[72px] items-center justify-center rounded-md border border-dashed border-border/40 text-subtle/50">
                            <span className="text-[10px]">Past</span>
                          </div>
                        )}
                        {hasShift && canSchedule ? (
                          <p className="pointer-events-none mt-1 text-center text-[9px] font-medium uppercase tracking-wide text-subtle opacity-0 transition-opacity group-hover:opacity-100">
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
    </div>
  );
}
