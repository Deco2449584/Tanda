'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  compareInputDates,
  isDateInRange,
  isOnOrAfterToday,
  normalizeInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { isShiftStrictlyUpcoming } from '@/lib/schedule/shift-future';
import { buildWeekRange } from '@/lib/schedule/week';
import { db } from '@/lib/firebase';
import type { Shift } from '@/lib/types/shift';

interface UseEmployeeShiftsOptions {
  /** Código corto del empleado (ej. '0002'), NO el doc.id de Firestore. */
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
  const [error, setError] = useState('');

  const todayKey = toInputDate();
  const week = useMemo(
    () => buildWeekRange(weekReference ?? new Date()),
    [weekReference, todayKey],
  );

  const code = employeeCode.trim();

  useEffect(() => {
    if (!db || !code) {
      setAllShifts([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    const shiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('employeeId', '==', code),
    );

    const unsubscribe = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapShiftDoc(document.id, document.data()),
        );
        setAllShifts(mapped);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('useEmployeeShifts', snapshotError);
        setAllShifts([]);
        setLoading(false);
        setError('No se pudieron cargar los turnos.');
      },
    );

    return () => unsubscribe();
  }, [code]);

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
    error,
  };
}
