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
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import {
  AttendanceDateFilterBar,
  type AttendanceDatePreset,
} from '@/components/attendance/AttendanceDateFilterBar';
import { AttendanceTable, filterRecordsByEmployeeName } from '@/components/attendance/AttendanceTable';
import { AddManualCheckoutModal } from '@/components/attendance/AddManualCheckoutModal';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';
import { exportAttendanceRecordsToCsv } from '@/lib/attendance/export-csv';
import {
  buildPayrollReport,
  exportPayrollReportToCsv,
  formatPayrollSummaryText,
} from '@/lib/attendance/export-payroll-csv';
import {
  getCurrentWeekDateRange,
  getDefaultDateRange,
  getLastWeekRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

function resolveAttendancePreset(range: DateRange): AttendanceDatePreset {
  const thisWeek = getCurrentWeekDateRange();
  if (range.start === thisWeek.start && range.end === thisWeek.end) {
    return 'thisWeek';
  }

  const lastWeek = getLastWeekRange();
  if (range.start === lastWeek.start && range.end === lastWeek.end) {
    return 'lastWeek';
  }

  return 'custom';
}

export default function AttendancePage() {
  const { settings } = useCompanySettings();
  const { employees, loading: employeesLoading } = useEmployees();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [datePreset, setDatePreset] = useState<AttendanceDatePreset>('thisWeek');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [manualCheckoutRecord, setManualCheckoutRecord] =
    useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { start, end } = toFirestoreRangeBounds(dateRange);

    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(5000),
    );

    const unsubscribeRecords = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        );
        setRecords(mapped);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading attendance records:', error);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeRecords();
    };
  }, [dateRange]);

  const pageLoading = loading || employeesLoading;

  const employeeCodes = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((employee) => {
      const code = employee.employeeId || '—';
      map[employee.id] = code;
      if (employee.employeeId) {
        map[employee.employeeId] = employee.employeeId;
      }
    });
    return map;
  }, [employees]);

  const filteredForExport = useMemo(
    () => filterRecordsByEmployeeName(records, searchQuery),
    [records, searchQuery],
  );

  const employeesByCode = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((employee) => {
      if (employee.employeeId) {
        map[employee.employeeId] = employee;
      }
    });
    return map;
  }, [employees]);

  const manualCheckoutEmployee = manualCheckoutRecord
    ? employeesByCode[manualCheckoutRecord.employeeId] ?? null
    : null;

  const activeEmployeeCount = useMemo(
    () => employees.filter((employee) => employee.active).length,
    [employees],
  );

  function handlePayrollExport() {
    const exported = exportPayrollReportToCsv(records, employees, dateRange, {
      currency: settings.currency,
    });

    if (!exported) {
      window.alert('No active employees to include in the payroll report.');
      return;
    }

    const summary = formatPayrollSummaryText(
      buildPayrollReport(records, employees, dateRange, {
        currency: settings.currency,
      }),
    );
    window.alert(`Payroll CSV downloaded.\n\n${summary}`);
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Time tracking and attendance (Audit)
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <AttendanceDateFilterBar
          dateRange={dateRange}
          activePreset={datePreset}
          onPresetChange={setDatePreset}
          onRangeChange={(range) => {
            setDateRange(range);
            setDatePreset(resolveAttendancePreset(range));
          }}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              exportAttendanceRecordsToCsv(filteredForExport, employeeCodes)
            }
            disabled={pageLoading || filteredForExport.length === 0}
            title="Export attendance report (CSV)"
            aria-label="Export attendance report (CSV)"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={handlePayrollExport}
            disabled={pageLoading || activeEmployeeCount === 0}
            title="Weekly payroll CSV for accounting (period, hours, days, rate, gross pay)"
            aria-label="Export weekly payroll CSV for accounting"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <AttendanceTable
        records={records}
        employeeCodes={employeeCodes}
        loading={pageLoading}
        searchQuery={searchQuery}
        onEdit={setEditingRecord}
        onAddManualCheckout={setManualCheckoutRecord}
      />

      <EditAttendanceModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />

      <AddManualCheckoutModal
        checkInRecord={manualCheckoutRecord}
        employee={manualCheckoutEmployee}
        allRecords={records}
        onClose={() => setManualCheckoutRecord(null)}
      />
    </div>
  );
}
