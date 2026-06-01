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
import { Download, Search } from 'lucide-react';
import { AttendanceTable, filterRecordsByEmployeeName } from '@/components/attendance/AttendanceTable';
import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import { AddManualCheckoutModal } from '@/components/attendance/AddManualCheckoutModal';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';
import { exportAttendanceRecordsToCsv } from '@/lib/attendance/export-csv';
import { exportPayrollReportToCsv } from '@/lib/attendance/export-payroll-csv';
import {
  getDefaultDateRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
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

    let recordsReady = false;
    let employeesReady = false;

    function checkReady() {
      if (recordsReady && employeesReady) {
        setLoading(false);
      }
    }

    const { start, end } = toFirestoreRangeBounds(dateRange);

    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(200),
    );

    const unsubscribeRecords = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        );
        setRecords(mapped);
        recordsReady = true;
        checkReady();
      },
      (error) => {
        console.error('Error loading attendance records:', error);
        recordsReady = true;
        checkReady();
      },
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapEmployeeDoc(document.id, document.data()),
        );
        setEmployees(mapped);
        employeesReady = true;
        checkReady();
      },
      () => {
        employeesReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeRecords();
      unsubscribeEmployees();
    };
  }, [dateRange]);

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Time tracking and attendance (Audit)
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <DateRangePicker value={dateRange} onChange={setDateRange} />

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
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-blue-600/50 focus:ring-1 focus:ring-blue-600/30"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              exportAttendanceRecordsToCsv(filteredForExport, employeeCodes)
            }
            disabled={loading || filteredForExport.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            EXPORT REPORT (CSV)
          </button>

          <button
            type="button"
            onClick={() =>
              exportPayrollReportToCsv(records, employees, dateRange)
            }
            disabled={loading || records.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600/50 bg-blue-950/40 px-4 py-2.5 text-sm font-semibold tracking-wide text-blue-300 transition-colors hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            PAYROLL REPORT (CSV)
          </button>
        </div>
      </div>

      <AttendanceTable
        records={records}
        employeeCodes={employeeCodes}
        loading={loading}
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
