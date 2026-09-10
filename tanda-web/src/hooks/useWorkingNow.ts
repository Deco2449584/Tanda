'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import {
  buildWorkingNowPeople,
  groupWorkingNowBySite,
  type WorkingNowPerson,
  type WorkingNowSiteGroup,
} from '@/lib/dashboard/build-working-now';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

function todayRangeInTimeZone(timeZone: string): DateRange {
  const today = toInputDateInTimeZone(timeZone);
  return { start: today, end: today };
}

export function useWorkingNow(input: {
  timeZone: string;
  employees: readonly Employee[];
  locations: readonly Location[];
  locationFilter: string;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const todayKey = toInputDateInTimeZone(input.timeZone);

  useEffect(() => {
    if (!db) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const range = todayRangeInTimeZone(input.timeZone);
    const { start, end } = toFirestoreRangeBounds(range);

    const recordsQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(2000),
    );

    const unsubscribe = onSnapshot(
      recordsQuery,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        );
        setLoading(false);
      },
      (error) => {
        console.error('Error loading working-now attendance:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [input.timeZone, todayKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const people = useMemo(
    () =>
      buildWorkingNowPeople({
        records,
        employees: input.employees,
        timeZone: input.timeZone,
        locationFilter: input.locationFilter,
        locations: input.locations,
      }),
    [
      records,
      input.employees,
      input.timeZone,
      input.locationFilter,
      input.locations,
    ],
  );

  const groups = useMemo(() => groupWorkingNowBySite(people), [people]);

  const workingCount = people.filter((person) => person.status === 'working')
    .length;
  const onBreakCount = people.length - workingCount;

  return {
    people,
    groups,
    loading,
    nowMs,
    totalCount: people.length,
    workingCount,
    onBreakCount,
  } satisfies {
    people: WorkingNowPerson[];
    groups: WorkingNowSiteGroup[];
    loading: boolean;
    nowMs: number;
    totalCount: number;
    workingCount: number;
    onBreakCount: number;
  };
}
