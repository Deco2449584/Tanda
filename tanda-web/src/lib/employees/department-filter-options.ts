import type { Employee } from '@/lib/types/employee';

export interface DepartmentFilterOption {
  id: string;
  label: string;
}

const DEPARTMENT_FILTER_EXCLUDED = new Set(['kiosk', 'admin']);

function isSettingsDepartmentFilterOption(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return !DEPARTMENT_FILTER_EXCLUDED.has(trimmed.toLowerCase());
}

export function buildDepartmentFilterOptions(
  departmentNames: readonly string[],
): DepartmentFilterOption[] {
  const names = departmentNames.filter(isSettingsDepartmentFilterOption);

  return [
    { id: 'all', label: 'All departments' },
    ...[...new Set(names)]
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((name) => ({ id: name, label: name })),
  ];
}

export function filterEmployeesByDepartment<T extends Pick<Employee, 'department'>>(
  employees: readonly T[],
  departmentFilter: string,
): T[] {
  if (departmentFilter === 'all') return [...employees];
  return employees.filter((employee) => employee.department === departmentFilter);
}
