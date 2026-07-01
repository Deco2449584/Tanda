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
import { Download } from 'lucide-react';
import { AttendanceFilterToolbar } from '@/components/attendance/AttendanceFilterToolbar';
import { AttendanceToolbarButton } from '@/components/attendance/AttendanceToolbarButton';
import { filterRecordsByEmployeeName } from '@/components/attendance/AttendanceTable';
import { WorkedShiftsTable } from '@/components/worked-shifts/WorkedShiftsTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import {
  filterSessionsByDateRange,
  mapSessionsToRows,
} from '@/lib/attendance/describe-work-shift';
import {
  getDefaultDateRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { formatRecordDate } from '@/lib/attendance/format';
import { exportWorkedShiftsToCsv } from '@/lib/attendance/export-worked-shifts-csv';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import { employeeMatchesLocationFilter } from '@/lib/location-groups/format-location-group';
import {
  buildDepartmentFilterOptions,
  filterEmployeesByDepartment,
} from '@/lib/employees/department-filter-options';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  useEmployeeAttendance,
  type EmployeeRecordsRange,
} from '@/hooks/useEmployeeAttendance';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { isAdminAreaRole } from '@/lib/auth/roles';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useDepartments } from '@/providers/DepartmentsProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import type { AttendanceRecord } from '@/lib/types/attendance';

const EMPLOYEE_RANGE_OPTIONS: Array<{ id: EmployeeRecordsRange; label: string }> = [
  { id: '7days', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All' },
];

function filterEmployeeSessionsByRange(
  records: AttendanceRecord[],
  range: EmployeeRecordsRange,
): AttendanceRecord[] {
  if (range === 'all') return records;

  if (range === 'month') {
    const now = new Date();
    const monthStart = toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
    return records.filter((record) => {
      const recordDate = formatRecordDate(record.timestampServer);
      return compareInputDates(recordDate, monthStart) >= 0;
    });
  }

  const sevenDaysStart = new Date();
  sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);
  const start = toInputDate(sevenDaysStart);

  return records.filter((record) => {
    const recordDate = formatRecordDate(record.timestampServer);
    return compareInputDates(recordDate, start) >= 0;
  });
}

function EmployeeWorkedShiftsView() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);
  const { settings } = useCompanySettings();
  const [recordsRange, setRecordsRange] =
    useState<EmployeeRecordsRange>('7days');

  const employeeCode = employee?.employeeId ?? '';

  const {
    records: allRecords,
    loading: recordsLoading,
    refreshing,
    error: recordsError,
    refresh,
  } = useEmployeeAttendance({ employeeCode, displayRange: recordsRange });

  const employeePhotoUrl = employee?.photoUrl ?? '';

  const rows = useMemo(() => {
    const scoped = filterEmployeeSessionsByRange(allRecords, recordsRange);
    const sessions = buildWorkSessionsFromRecords(scoped, settings.attendanceBreak);
    return mapSessionsToRows(sessions, settings.attendanceBreak, {
      [employeeCode]: employeePhotoUrl,
    });
  }, [
    allRecords,
    recordsRange,
    settings.attendanceBreak,
    employeeCode,
    employeePhotoUrl,
  ]);

  const loading = authLoading || employeeLoading || recordsLoading;

  return (
    <>
      {employeeError && !employeeLoading ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      ) : null}

      {recordsError && employee && !recordsLoading ? (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {recordsError}
        </p>
      ) : null}

      {employee ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {EMPLOYEE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setRecordsRange(option.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    recordsRange === option.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-hover text-muted hover:text-foreground'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <RefreshButton
                onClick={refresh}
                refreshing={refreshing}
                disabled={loading}
              />
              <AttendanceToolbarButton
                onClick={() =>
                  exportWorkedShiftsToCsv(rows, {
                    [employeeCode]: employeeCode,
                  })
                }
                disabled={loading || rows.length === 0}
                title="Export worked shifts (CSV)"
                aria-label="Export worked shifts (CSV)"
              >
                <Download className="h-4 w-4" strokeWidth={2} />
              </AttendanceToolbarButton>
            </div>
          </div>

          <WorkedShiftsTable rows={rows} loading={loading} />
        </section>
      ) : null}
    </>
  );
}

function AdminWorkedShiftsView() {
  const { settings } = useCompanySettings();
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
      console.error('AdminWorkedShiftsView', error);
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

  const employeeIdsInFilter = useMemo(
    () => new Set(employeesForFilters.map((employee) => employee.employeeId)),
    [employeesForFilters],
  );

  const locationFilteredRecords = useMemo(
    () =>
      records.filter((record) => employeeIdsInFilter.has(record.employeeId)),
    [records, employeeIdsInFilter],
  );

  const searchFilteredRecords = useMemo(
    () => filterRecordsByEmployeeName(locationFilteredRecords, searchQuery),
    [locationFilteredRecords, searchQuery],
  );

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

  const employeePhotos = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((employee) => {
      if (employee.employeeId && employee.photoUrl) {
        map[employee.employeeId] = employee.photoUrl;
      }
    });
    return map;
  }, [employees]);

  const rows = useMemo(() => {
    const sessions = buildWorkSessionsFromRecords(
      searchFilteredRecords,
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
  }, [
    searchFilteredRecords,
    settings.attendanceBreak,
    dateRange,
    employeePhotos,
  ]);

  const pageLoading = loading || employeesLoading;

  return (
    <section className="space-y-4">
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
            <AttendanceToolbarButton
            onClick={() =>
              exportWorkedShiftsToCsv(rows, employeeCodes, dateRange)
            }
            disabled={pageLoading || rows.length === 0}
            title="Export worked shifts (CSV)"
            aria-label="Export worked shifts (CSV)"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
          </AttendanceToolbarButton>
          </>
        }
      />

      <WorkedShiftsTable
        rows={rows}
        loading={pageLoading}
        showEmployee
        employeeCodes={employeeCodes}
      />
    </section>
  );
}

export default function WorkedShiftsPage() {
  const { role, loading } = useAuthRole();
  const isAdmin = role !== null && isAdminAreaRole(role);

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="Worked shifts"
        description={
          isAdmin
            ? 'Completed shifts with check-in, check-out, hours, and break details.'
            : 'Your check-ins, check-outs, hours worked, and break details by shift.'
        }
      />

      {!loading && isAdmin ? <AdminWorkedShiftsView /> : null}
      {!loading && !isAdmin ? <EmployeeWorkedShiftsView /> : null}
    </PageContent>
  );
}
