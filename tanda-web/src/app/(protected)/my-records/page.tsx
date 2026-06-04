'use client';

import { useState } from 'react';
import { RecentRecordsTable } from '@/components/employee-dashboard/RecentRecordsTable';
import {
  useEmployeeAttendance,
  type EmployeeRecordsRange,
} from '@/hooks/useEmployeeAttendance';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';

export default function MyRecordsPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);
  const [recordsRange, setRecordsRange] =
    useState<EmployeeRecordsRange>('7days');

  const employeeCode = employee?.employeeId ?? '';

  const {
    records: displayRecords,
    loading: recordsLoading,
    error: recordsError,
  } = useEmployeeAttendance({ employeeCode, displayRange: recordsRange });

  const loading = authLoading || employeeLoading || recordsLoading;

  return (
    <div className="min-h-full space-y-5 bg-[#121212] p-4 md:space-y-6 md:p-6">
      <div>
        <h1 className="text-sm font-bold tracking-wide text-white uppercase md:text-base">
          My attendance records
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Check-ins, check-outs, and photo verification for your shifts.
        </p>
      </div>

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {recordsError && employee && !recordsLoading && (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {recordsError}
        </p>
      )}

      {employee && (
        <RecentRecordsTable
          records={displayRecords}
          loading={loading}
          range={recordsRange}
          onRangeChange={setRecordsRange}
        />
      )}
    </div>
  );
}
