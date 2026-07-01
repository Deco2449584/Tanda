'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  compareInputDates,
  isDateInRange,
  normalizeInputDate,
  offsetInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { isShiftStrictlyUpcoming } from '@/lib/schedule/shift-future';
import { buildWeekRange } from '@/lib/schedule/week';
import { db } from '@/lib/firebase';
import type { Shift } from '@/lib/types/shift';

const SHIFT_LOOKBACK_DAYS = 28;
const SHIFT_LOOKAHEAD_DAYS = 90;

interface UseEmployeeShiftsOptions {
  employeeCode: string;
  weekReference?: Date;
  includeUpcoming?: boolean;
}

export function useEmployeeShifts({
  employeeCode,
  weekReference = new Date(),
  includeUpcoming = true,
}: UseEmployeeShiftsOptions) {
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadDoneRef = useRef(false);

  const todayKey = toInputDate();
  const week = useMemo(
    () => buildWeekRange(weekReference ?? new Date()),
    [weekReference, todayKey],
  );

  const code = employeeCode.trim();
  const minDate = offsetInputDate(todayKey, -SHIFT_LOOKBACK_DAYS);
  const maxDate = offsetInputDate(todayKey, SHIFT_LOOKAHEAD_DAYS);

  const refresh = useCallback(async () => {
    if (!db || !code) {
      setAllShifts([]);
      setLoading(false);
      setRefreshing(false);
      setError('');
      initialLoadDoneRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.SHIFTS),
          where('employeeId', '==', code),
          where('date', '>=', minDate),
          where('date', '<=', maxDate),
        ),
      );
      setAllShifts(
        snapshot.docs.map((document) => mapShiftDoc(document.id, document.data())),
      );
    } catch (fetchError) {
      console.error('useEmployeeShifts', fetchError);
      setAllShifts([]);
      setError('Could not load shifts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [code, maxDate, minDate]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  const weekShifts = useMemo(() => {
    return allShifts
      .filter((shift) =>
        isDateInRange(
          normalizeInputDate(shift.date),
          week.start,
          week.end,
        ),
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
