'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { AlertTriangle, Users } from 'lucide-react';
import {
  PayrollExportMenu,
  type PayrollExportType,
} from '@/components/payroll/PayrollExportMenu';
import {
  PayrollPeriodFilterBar,
  type PayrollPeriodPreset,
} from '@/components/payroll/PayrollPeriodFilterBar';
import { PayrollReportTable } from '@/components/payroll/PayrollReportTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import {
  filterSessionsByDateRange,
  mapSessionsToRows,
} from '@/lib/attendance/describe-work-shift';
import {
  buildPayrollReport,
  exportPayrollByDepartmentToCsv,
  exportPayrollByLocationToCsv,
  exportPayrollJournalToCsv,
  exportPayrollReportToCsv,
  type PayrollReport,
} from '@/lib/attendance/export-payroll-csv';
import { exportApprovedLeaveInPeriodToCsv } from '@/lib/attendance/export-leave-period-csv';
import { exportWorkedShiftsToCsv } from '@/lib/attendance/export-worked-shifts-csv';
import {
  getLastWeekRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import { COMPANY_NAME, DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';

export default function PayrollPage() {
  const { canPerformAction } = useAdminAccess();
  const canExport = canPerformAction('payroll', 'export');
  const { settings } = useCompanySettings();
  const { employees, loading: employeesLoading } = useEmployees();
  const { locations, loading: locationsLoading } = useLocations();

  const [dateRange, setDateRange] = useState<DateRange>(() => getLastWeekRange());
  const [preset, setPreset] = useState<PayrollPeriodPreset>('last-week');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { start, end } = toFirestoreRangeBounds(dateRange);
      const [attendanceSnapshot, leaveSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
            where('timestampServer', '>=', start),
            where('timestampServer', '<=', end),
            orderBy('timestampServer', 'desc'),
            limit(5000),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.LEAVE_REQUESTS),
            orderBy('createdAt', 'desc'),
          ),
        ),
      ]);

      setRecords(
        attendanceSnapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        ),
      );
      setLeaveRequests(
        leaveSnapshot.docs.map((document) =>
          mapLeaveRequestDoc(document.id, document.data()),
        ),
      );
    } catch (error) {
      console.error('PayrollPage', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [dateRange]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void loadData();
  }, [loadData]);

  const exportOptions = useMemo(
    () => ({
      companyName: COMPANY_NAME,
      currency: settings.currency,
      attendanceBreak: settings.attendanceBreak,
      locations,
      payrollAccounting:
        settings.payrollAccounting ?? DEFAULT_PAYROLL_ACCOUNTING,
    }),
    [settings, locations],
  );

  const report = useMemo<PayrollReport | null>(() => {
    if (employeesLoading || locationsLoading) return null;
    return buildPayrollReport(records, employees, dateRange, exportOptions);
  }, [
    records,
    employees,
    dateRange,
    exportOptions,
    employeesLoading,
    locationsLoading,
  ]);

  const employeeCodes = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((employee) => {
      if (employee.employeeId) {
        map[employee.employeeId] = employee.employeeId;
      }
      map[employee.id] = employee.employeeId || '—';
    });
    return map;
  }, [employees]);

  const employeeHourlyRates = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach((employee) => {
      if (employee.employeeId) {
        map[employee.employeeId] = employee.hourlyRate ?? 0;
      }
    });
    return map;
  }, [employees]);

  const employeePhotos = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((employee) => {
      if (employee.employeeId && employee.photoUrl) {
        map[employee.employeeId] = employee.photoUrl;
      }
    });
    return map;
  }, [employees]);

  const workedShiftRows = useMemo(() => {
    const sessions = buildWorkSessionsFromRecords(
      records,
      settings.attendanceBreak,
    );
    const inRange = filterSessionsByDateRange(
      sessions,
      dateRange.start,
      dateRange.end,
    );
    return mapSessionsToRows(
      inRange,
      settings.attendanceBreak,
      employeePhotos,
    );
  }, [records, settings.attendanceBreak, dateRange, employeePhotos]);

  const pageLoading = loading || employeesLoading || locationsLoading;

  function handleExport(type: PayrollExportType) {
    if (!canExport) return;

    let exported = false;

    switch (type) {
      case 'summary':
        exported = exportPayrollReportToCsv(
          records,
          employees,
          dateRange,
          exportOptions,
        );
        break;
      case 'by-location':
        exported = exportPayrollByLocationToCsv(
          records,
          employees,
          dateRange,
          exportOptions,
        );
        break;
      case 'by-department':
        exported = exportPayrollByDepartmentToCsv(
          records,
          employees,
          dateRange,
          exportOptions,
        );
        break;
      case 'journal':
        exported = exportPayrollJournalToCsv(
          records,
          employees,
          dateRange,
          exportOptions,
        );
        break;
      case 'timesheet':
        if (workedShiftRows.length === 0) return;
        exportWorkedShiftsToCsv(
          workedShiftRows,
          employeeCodes,
          dateRange,
          employeeHourlyRates,
        );
        exported = true;
        break;
      case 'leave':
        exported = exportApprovedLeaveInPeriodToCsv(
          leaveRequests,
          employees,
          dateRange,
        );
        break;
    }

    if (!exported && type !== 'timesheet' && type !== 'leave') {
      window.alert('No active employees to export for this period.');
    }
  }

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="Payroll"
        description="Weekly payroll summary and CSV exports for accounting. Gross pay is based on billable hours and hourly rates."
      />

      <section className="space-y-4">
        <PayrollPeriodFilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
          actions={
            <>
              <RefreshButton
                onClick={loadData}
                refreshing={refreshing}
                disabled={pageLoading}
              />
              {canExport ? (
                <PayrollExportMenu
                  disabled={pageLoading}
                  report={report}
                  onExport={handleExport}
                />
              ) : null}
            </>
          }
        />

        {report && report.incompleteSessions > 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              {report.incompleteSessions} incomplete session
              {report.incompleteSessions === 1 ? '' : 's'} in this period (missing
              check-out) are excluded from pay.{' '}
              <Link
                href="/attendance"
                className="font-medium text-amber-200 underline hover:text-white"
              >
                Review attendance
              </Link>
            </p>
          </div>
        ) : null}

        {report ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total gross payroll"
              value={formatDashboardCurrency(
                report.totals.grossPay,
                report.currency,
              )}
            />
            <SummaryCard
              label="Employees"
              value={String(report.totals.employees)}
              icon={<Users className="h-4 w-4 text-primary" />}
            />
            <SummaryCard
              label="Hours worked"
              value={report.totals.totalHours.toFixed(2)}
            />
            <SummaryCard
              label="Days worked"
              value={String(report.totals.daysWorked)}
            />
          </div>
        ) : null}

        <PayrollReportTable report={report} loading={pageLoading} />
      </section>
    </PageContent>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}
