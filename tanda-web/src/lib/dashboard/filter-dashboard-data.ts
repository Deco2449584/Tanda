import { employeeMatchesLocationFilter } from '@/lib/location-groups/format-location-group';
import { getLocationLabel } from '@/lib/locations/format-location';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';
import type { Shift } from '@/lib/types/shift';

export function filterEmployeesByLocation(
  employees: Employee[],
  locationFilter: string,
  groups: readonly LocationGroup[],
): Employee[] {
  if (!locationFilter || locationFilter === 'all') return employees;

  return employees.filter((employee) =>
    employeeMatchesLocationFilter(employee, locationFilter, groups),
  );
}

export function buildAllowedEmployeeIds(employees: Employee[]): Set<string> {
  return new Set(employees.map((employee) => employee.employeeId));
}

export function filterAttendanceByEmployees(
  records: AttendanceRecord[],
  allowedEmployeeIds: Set<string>,
): AttendanceRecord[] {
  return records.filter((record) => allowedEmployeeIds.has(record.employeeId));
}

export function filterShiftsForDashboard(
  shifts: Shift[],
  employeesById: Map<string, Employee>,
  locationFilter: string,
  groups: readonly LocationGroup[],
): Shift[] {
  if (!locationFilter || locationFilter === 'all') return shifts;

  return shifts.filter((shift) => {
    if (shift.locationId === locationFilter) return true;

    const employee = employeesById.get(shift.employeeId);
    if (!employee) return false;

    return employeeMatchesLocationFilter(employee, locationFilter, groups);
  });
}

export function getSiteKeyForEmployee(
  employee: Employee,
  locations: readonly Location[],
): string {
  const label = getLocationLabel(employee.locationId, locations);
  return label === '—' ? 'Unassigned' : label;
}

export function getSiteKeyForShift(
  shift: Shift,
  locations: readonly Location[],
): string {
  if (shift.locationNameSnapshot?.trim()) {
    return shift.locationNameSnapshot.trim();
  }

  const label = getLocationLabel(shift.locationId, locations);
  return label === '—' ? 'Unassigned' : label;
}
