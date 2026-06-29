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
import { Download, FileSpreadsheet, MapPin, Plus, Search } from 'lucide-react';
import {
  AttendanceDateFilterBar,
} from '@/components/attendance/AttendanceDateFilterBar';
import { AttendanceTable, filterRecordsByEmployeeName } from '@/components/attendance/AttendanceTable';
import { AddManualCheckoutModal } from '@/components/attendance/AddManualCheckoutModal';
import { AddManualRecordModal } from '@/components/attendance/AddManualRecordModal';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';
import { exportAttendanceRecordsToCsv } from '@/lib/attendance/export-csv';
import {
  buildPayrollReport,
  exportPayrollReportToCsv,
  formatPayrollSummaryText,
} from '@/lib/attendance/export-payroll-csv';
import {
  getDefaultDateRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { employeeMatchesLocationFilter } from '@/lib/location-groups/format-location-group';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

export default function AttendancePage() {
  const { settings } = useCompanySettings();
  const { canPerformAction } = useAdminAccess();
  const canCreateAttendance = canPerformAction('attendance', 'create');
  const canUpdateAttendance = canPerformAction('attendance', 'update');
  const canDeleteAttendance = canPerformAction('attendance', 'delete');
  const { employees, loading: employeesLoading } = useEmployees();
  const { groups } = useLocationGroups();
  const { locations } = useLocations();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [manualCheckoutRecord, setManualCheckoutRecord] =
    useState<AttendanceRecord | null>(null);
  const [manualRecordOpen, setManualRecordOpen] = useState(false);

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

  const locationOptions = useMemo(
    () => [
      { id: 'all', label: 'All locations' },
      ...locations.map((location) => ({
        id: location.id,
        label: location.city
          ? `${location.name} (${location.city})`
          : location.name,
      })),
    ],
    [locations],
  );

  const employeesForFilters = useMemo(() => {
    if (locationFilter === 'all') return employees;
    return employees.filter((employee) =>
      employeeMatchesLocationFilter(employee, locationFilter, groups),
    );
  }, [employees, locationFilter]);

  const allowedEmployeeIds = useMemo(
    () =>
      new Set(
        employeesForFilters
          .map((employee) => employee.employeeId)
          .filter((employeeId) => Boolean(employeeId)),
      ),
    [employeesForFilters],
  );

  const locationFilteredRecords = useMemo(() => {
    if (locationFilter === 'all') return records;
    return records.filter((record) => allowedEmployeeIds.has(record.employeeId));
  }, [allowedEmployeeIds, locationFilter, records]);

  const employeeCodes = useMemo(() => {
    const map: Record<string, string> = {};
    employeesForFilters.forEach((employee) => {
      const code = employee.employeeId || '—';
      map[employee.id] = code;
      if (employee.employeeId) {
        map[employee.employeeId] = employee.employeeId;
      }
    });
    return map;
  }, [employeesForFilters]);

  const filteredForExport = useMemo(
    () => filterRecordsByEmployeeName(locationFilteredRecords, searchQuery),
    [locationFilteredRecords, searchQuery],
  );

  const employeesByCode = useMemo(() => {
    const map: Record<string, Employee> = {};
    employeesForFilters.forEach((employee) => {
      if (employee.employeeId) {
        map[employee.employeeId] = employee;
      }
    });
    return map;
  }, [employeesForFilters]);

  const manualCheckoutEmployee = manualCheckoutRecord
    ? employeesByCode[manualCheckoutRecord.employeeId] ?? null
    : null;

  const activeEmployeeCount = useMemo(
    () => employeesForFilters.filter((employee) => employee.active).length,
    [employeesForFilters],
  );

  function handlePayrollExport() {
    const exported = exportPayrollReportToCsv(
      locationFilteredRecords,
      employeesForFilters,
      dateRange,
      {
        currency: settings.currency,
        attendanceBreak: settings.attendanceBreak,
      },
    );

    if (!exported) {
      window.alert('No active employees to include in the payroll report.');
      return;
    }

    const summary = formatPayrollSummaryText(
      buildPayrollReport(locationFilteredRecords, employeesForFilters, dateRange, {
        currency: settings.currency,
        attendanceBreak: settings.attendanceBreak,
      }),
    );
    window.alert(`Payroll CSV downloaded.\n\n${summary}`);
  }

  return (
    <PageContent className="space-y-6">
      <PageHeader title="Time tracking and attendance (Audit)" />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="w-full min-w-0">
          <AttendanceDateFilterBar
            dateRange={dateRange}
            onRangeChange={setDateRange}
          />
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:min-w-[220px] sm:flex-1">
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                aria-label="Filter by location"
              >
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id} className="bg-surface-raised">
                    {location.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:min-w-[200px] sm:flex-[1.2]">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee..."
                className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {canCreateAttendance ? (
              <button
                type="button"
                onClick={() => setManualRecordOpen(true)}
                disabled={pageLoading}
                title="Add manual check-in or check-out"
                aria-label="Add manual check-in or check-out"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/80 text-muted transition-colors duration-150 hover:border-primary/40 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() =>
                exportAttendanceRecordsToCsv(filteredForExport, employeeCodes)
              }
              disabled={pageLoading || filteredForExport.length === 0}
              title="Export attendance report (CSV)"
              aria-label="Export attendance report (CSV)"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/80 text-muted transition-colors duration-150 hover:border-primary/40 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={handlePayrollExport}
              disabled={pageLoading || activeEmployeeCount === 0}
              title="Weekly payroll CSV for accounting (period, hours, days, rate, gross pay)"
              aria-label="Export weekly payroll CSV for accounting"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/80 text-muted transition-colors duration-150 hover:border-primary/40 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <AttendanceTable
        records={locationFilteredRecords}
        employeeCodes={employeeCodes}
        loading={pageLoading}
        searchQuery={searchQuery}
        onEdit={canUpdateAttendance ? setEditingRecord : undefined}
        onAddManualCheckout={
          canCreateAttendance ? setManualCheckoutRecord : undefined
        }
        canUpdate={canUpdateAttendance}
        canDelete={canDeleteAttendance}
      />

      <EditAttendanceModal
        record={editingRecord}
        locations={locations}
        attendanceBreak={settings.attendanceBreak}
        onClose={() => setEditingRecord(null)}
      />

      <AddManualRecordModal
        open={manualRecordOpen}
        employees={employeesForFilters}
        locations={locations}
        allRecords={locationFilteredRecords}
        onClose={() => setManualRecordOpen(false)}
      />

      <AddManualCheckoutModal
        checkInRecord={manualCheckoutRecord}
        employee={manualCheckoutEmployee}
        allRecords={locationFilteredRecords}
        onClose={() => setManualCheckoutRecord(null)}
      />
    </PageContent>
  );
}
