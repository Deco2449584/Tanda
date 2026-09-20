'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { DateRange } from '@/lib/attendance/date-range';
import { toFirestoreRangeBounds } from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Shift } from '@/lib/types/shift';

interface ComparisonData {
  shifts: Shift[];
  attendance: AttendanceRecord[];
}

const EMPTY: ComparisonData = { shifts: [], attendance: [] };

/** Survives widget remounts and Compare toggling within the session. */
const cache = new Map<string, ComparisonData>();

/**
 * Loads shifts and attendance for the preceding period. Opt-in: nothing is
 * fetched until the admin turns Compare on, and every range is cached so
 * toggling it back and forth costs no extra Firestore reads.
 */
export function useDashboardComparison(range: DateRange, enabled: boolean) {
  const cacheKey = `${range.start}|${range.end}`;
  const [data, setData] = useState<ComparisonData>(
    () => cache.get(cacheKey) ?? EMPTY,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setData(EMPTY);
      setLoading(false);
      return;
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    if (!db) {
      setData(EMPTY);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const bounds = toFirestoreRangeBounds(range);
        const [shiftsSnapshot, attendanceSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, COLLECTIONS.SHIFTS),
              where('date', '>=', range.start),
              where('date', '<=', range.end),
              orderBy('date', 'asc'),
            ),
          ),
          getDocs(
            query(
              collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
              where('timestampServer', '>=', bounds.start),
              where('timestampServer', '<=', bounds.end),
              orderBy('timestampServer', 'desc'),
              limit(5000),
            ),
          ),
        ]);

        const next: ComparisonData = {
          shifts: shiftsSnapshot.docs.map((document) =>
            mapShiftDoc(document.id, document.data()),
          ),
          attendance: attendanceSnapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        };

        cache.set(cacheKey, next);
        if (!cancelled) setData(next);
      } catch (error) {
        console.error('useDashboardComparison', error);
        if (!cancelled) setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, enabled, range]);

  return {
    shifts: data.shifts,
    attendance: data.attendance,
    loading,
    ready: enabled && !loading,
  };
}
