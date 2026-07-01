'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
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
import { RefreshButton } from '@/components/ui/RefreshButton';
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
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const loadRecords = useCallback(async () => {
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
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
          where('timestampServer', '>=', start),
          where('timestampServer', '<=', end),
          orderBy('timestampServer', 'desc'),
          limit(5000),
        ),
      );
      setRecords(
        snapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        ),
      );
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [dateRange]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void loadRecords();
  }, [loadRecords]);

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
    if (departmentFilter === 'all' && locationFilter === 'all') return records;
    return records.filter((record) => allowedEmployeeIds.has(record.employeeId));
  }, [allowedEmployeeIds, departmentFilter, locationFilter, records]);

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
            <RefreshButton
              onClick={loadRecords}
              refreshing={refreshing}
              disabled={pageLoading}
            />

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
