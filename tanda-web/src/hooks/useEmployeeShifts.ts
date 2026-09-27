'use client';

import { useMemo } from 'react';
import {
  compareInputDates,
  isDateInRange,
  normalizeInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import { isShiftStrictlyUpcoming } from '@/lib/schedule/shift-future';
import { buildWeekRange } from '@/lib/schedule/week';
import { useEmployeeShiftsContext } from '@/providers/EmployeeShiftsProvider';
import type { Shift } from '@/lib/types/shift';

interface UseEmployeeShiftsOptions {
  employeeCode?: string;
  weekReference?: Date;
  includeUpcoming?: boolean;
}

export function useEmployeeShifts({
  weekReference = new Date(),
  includeUpcoming = true,
}: UseEmployeeShiftsOptions = {}) {
  const { allShifts, loading, refreshing, error, refresh } =
    useEmployeeShiftsContext();

  const todayKey = toInputDate();
  const week = useMemo(
    () => buildWeekRange(weekReference ?? new Date()),
    [weekReference, todayKey],
  );

  const weekShifts = useMemo(() => {
    return allShifts
      .filter((shift) =>
        isDateInRange(normalizeInputDate(shift.date), week.start, week.end),
      )
      .sort((a, b) => compareInputDates(a.date, b.date));
  }, [allShifts, week.end, week.start]);

  const upcomingShifts = useMemo(() => {
    if (!includeUpcoming) return [];

    const today = toInputDate();
    return allShifts
      .filter(
        (shift) =>
          compareInputDates(normalizeInputDate(shift.date), today) >= 0,
      )
      .sort((a, b) => {
        const byDate = compareInputDates(a.date, b.date);
        if (byDate !== 0) return byDate;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [allShifts, includeUpcoming]);

  const nextScheduledShift = useMemo(() => {
    return (
      upcomingShifts.find(
        (shift) =>
          shift.status === 'scheduled' && isShiftStrictlyUpcoming(shift),
      ) ?? null
    );
  }, [upcomingShifts]);

  const futureShifts = useMemo(() => {
    return upcomingShifts.filter(
      (shift) =>
        shift.status === 'scheduled' && isShiftStrictlyUpcoming(shift),
    );
  }, [upcomingShifts]);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift> = {};
    weekShifts.forEach((shift) => {
      map[normalizeInputDate(shift.date)] = shift;
    });
    return map;
  }, [weekShifts]);

  return {
    week,
    weekShifts,
    allShifts,
    upcomingShifts,
    futureShifts,
    nextScheduledShift,
    shiftsByDate,
    loading,
    refreshing,
    error,
    refresh,
  };
}
