'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { RecentRecordsTable } from '@/components/employee-dashboard/RecentRecordsTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
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
    refreshing,
    error: recordsError,
    refresh,
  } = useEmployeeAttendance({ employeeCode, displayRange: recordsRange });

  const loading = authLoading || employeeLoading || recordsLoading;

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="My attendance records"
        description="Check-ins, check-outs, and photo verification for your shifts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/worked-shifts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              Worked shifts
            </Link>
            <RefreshButton
              onClick={refresh}
              refreshing={refreshing}
              disabled={loading}
            />
          </div>
        }
      />

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {recordsError && employee && !recordsLoading && (
        <p className="rounded-xl border border-border bg-surface-raised/60 px-4 py-3 text-sm text-muted">
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
    </PageContent>
  );
}
