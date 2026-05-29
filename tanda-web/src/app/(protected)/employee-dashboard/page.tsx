'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { MonthlyHoursCard } from '@/components/employee-dashboard/MonthlyHoursCard';
import { NextShiftCard } from '@/components/employee-dashboard/NextShiftCard';
import { RecentRecordsTable } from '@/components/employee-dashboard/RecentRecordsTable';
import { WeeklyHoursCard } from '@/components/employee-dashboard/WeeklyHoursCard';
import { WeeklyScheduleStrip } from '@/components/employee-dashboard/WeeklyScheduleStrip';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { COLLECTIONS } from '@/lib/constants';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { buildWeekRange } from '@/lib/schedule/week';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Shift } from '@/lib/types/shift';

function todayInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EmployeeDashboardPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);

  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [weekShifts, setWeekShifts] = useState<Shift[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const week = useMemo(() => buildWeekRange(new Date()), []);
  const employeeCode = employee?.employeeId ?? '';

  useEffect(() => {
    if (!db || !employeeCode) {
      setRecentRecords([]);
      setWeekShifts([]);
      setUpcomingShifts([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);

    let recordsReady = false;
    let weekShiftsReady = false;
    let upcomingReady = false;

    function checkReady() {
      if (recordsReady && weekShiftsReady && upcomingReady) {
        setDataLoading(false);
      }
    }

    const recordsQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('employeeId', '==', employeeCode),
      orderBy('timestampServer', 'desc'),
    );

    const unsubscribeRecords = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((document) => mapAttendanceDoc(document.id, document.data()))
          .slice(0, 4);
        setRecentRecords(mapped);
        recordsReady = true;
        checkReady();
      },
      () => {
        recordsReady = true;
        checkReady();
      },
    );

    const weekShiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('employeeId', '==', employeeCode),
      where('date', '>=', week.start),
      where('date', '<=', week.end),
    );

    const unsubscribeWeekShifts = onSnapshot(
      weekShiftsQuery,
      (snapshot) => {
        setWeekShifts(
          snapshot.docs.map((document) =>
            mapShiftDoc(document.id, document.data()),
          ),
        );
        weekShiftsReady = true;
        checkReady();
      },
      () => {
        weekShiftsReady = true;
        checkReady();
      },
    );

    const upcomingQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('employeeId', '==', employeeCode),
      where('date', '>=', todayInputDate()),
      orderBy('date', 'asc'),
    );

    const unsubscribeUpcoming = onSnapshot(
      upcomingQuery,
      (snapshot) => {
        setUpcomingShifts(
          snapshot.docs.map((document) =>
            mapShiftDoc(document.id, document.data()),
          ),
        );
        upcomingReady = true;
        checkReady();
      },
      () => {
        upcomingReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeRecords();
      unsubscribeWeekShifts();
      unsubscribeUpcoming();
    };
  }, [employeeCode, week.start, week.end]);

  const nextShift = useMemo(() => {
    return (
      upcomingShifts
        .filter((shift) => shift.status === 'scheduled')
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        })[0] ?? null
    );
  }, [upcomingShifts]);

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift> = {};
    weekShifts.forEach((shift) => {
      map[shift.date] = shift;
    });
    return map;
  }, [weekShifts]);

  const loading = authLoading || employeeLoading || dataLoading;

  return (
    <div className="space-y-6 bg-[#121212] p-6 min-h-full">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Mi resumen general
      </h1>

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {employee && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <WeeklyHoursCard />
            <MonthlyHoursCard />
            <NextShiftCard
              employee={employee}
              nextShift={nextShift}
              loading={dataLoading}
            />
          </div>

          <RecentRecordsTable records={recentRecords} loading={loading} />

          <WeeklyScheduleStrip
            weekDays={week.days}
            shiftsByDate={shiftsByDate}
            loading={dataLoading}
          />
        </>
      )}
    </div>
  );
}
