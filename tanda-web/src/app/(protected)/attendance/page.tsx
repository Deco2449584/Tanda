'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Download, Plus } from 'lucide-react';
import { AttendanceFilterToolbar } from '@/components/attendance/AttendanceFilterToolbar';
import { AttendanceTable, filterRecordsByEmployeeName } from '@/components/attendance/AttendanceTable';
import { AttendanceToolbarButton } from '@/components/attendance/AttendanceToolbarButton';
import { AddManualCheckoutModal } from '@/components/attendance/AddManualCheckoutModal';
import { AddManualRecordModal } from '@/components/attendance/AddManualRecordModal';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';
import { exportAttendanceRecordsToCsv } from '@/lib/attendance/export-csv';
import {
  getDefaultDateRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useDepartments } from '@/providers/DepartmentsProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { employeeMatchesLocationFilter } from '@/lib/location-groups/format-location-group';
import {
  buildDepartmentFilterOptions,
  filterEmployeesByDepartment,
} from '@/lib/employees/department-filter-options';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { isForgottenCheckIn } from '@/lib/attendance/work-sessions';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

export default function AttendancePage() {
  const searchParams = useSearchParams();
  const { settings } = useCompanySettings();
  const { canPerformAction } = useAdminAccess();
  const canCreateAttendance = canPerformAction('attendance', 'create');
  const canUpdateAttendance = canPerformAction('attendance', 'update');
  const canDeleteAttendance = canPerformAction('attendance', 'delete');
  const { employees, loading: employeesLoading } = useEmployees();
  const { departmentNames } = useDepartments();
  const { groups } = useLocationGroups();
  const { locations } = useLocations();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(
    null,
  );
  const [manualCheckoutRecord, setManualCheckoutRecord] =
    useState<AttendanceRecord | null>(null);
  const [manualRecordOpen, setManualRecordOpen] = useState(false);
  const initialLoadDoneRef = useRef(false);
  const [forgottenOnly, setForgottenOnly] = useState(false);

  useEffect(() => {
    const range = searchParams.get('range');
    const date = searchParams.get('date');
    const filter = searchParams.get('filter');

    if (range === 'today') {
      const today =
        date && /^\d{4}-\d{2}-\d{2}$/.test(date)
          ? date
          : toInputDateInTimeZone(settings.timeZone);
      setDateRange({ start: today, end: today });
    }

    setForgottenOnly(filter === 'forgotten');
  }, [searchParams, settings.timeZone]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    setLoading(true);
  }, [dateRange]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    }

    const { start, end } = toFirestoreRangeBounds(dateRange);
    const recordsQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(5000),
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
        initialLoadDoneRef.current = true;
      },
      (error) => {
        console.error('Error loading attendance records:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [dateRange]);

  const pageLoading = loading || employeesLoading;

  const departmentOptions = useMemo(
    () => buildDepartmentFilterOptions(departmentNames),
    [departmentNames],
  );

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
    let base = filterEmployeesByDepartment(employees, departmentFilter);

    if (locationFilter !== 'all') {
      base = base.filter((employee) =>
        employeeMatchesLocationFilter(employee, locationFilter, groups),
      );
    }

    return base;
  }, [employees, departmentFilter, locationFilter, groups]);

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
    let base =
      departmentFilter === 'all' && locationFilter === 'all'
        ? records
        : records.filter((record) => allowedEmployeeIds.has(record.employeeId));

    if (forgottenOnly) {
      base = base.filter((record) => isForgottenCheckIn(record, records));
    }

    return base;
  }, [
    allowedEmployeeIds,
    departmentFilter,
    forgottenOnly,
    locationFilter,
    records,
  ]);

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

  return (
    <PageContent className="space-y-6">
      <PageHeader title="Time tracking and attendance (Audit)" />

      <AttendanceFilterToolbar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        departmentOptions={departmentOptions}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locationOptions={locationOptions}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        actions={
          <>
            {canCreateAttendance ? (
              <AttendanceToolbarButton
                onClick={() => setManualRecordOpen(true)}
                disabled={pageLoading}
                title="Add manual check-in or check-out"
                aria-label="Add manual check-in or check-out"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </AttendanceToolbarButton>
            ) : null}

            <AttendanceToolbarButton
              onClick={() =>
                exportAttendanceRecordsToCsv(filteredForExport, employeeCodes)
              }
              disabled={pageLoading || filteredForExport.length === 0}
              title="Export attendance report (CSV)"
              aria-label="Export attendance report (CSV)"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
            </AttendanceToolbarButton>
          </>
        }
      />

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
