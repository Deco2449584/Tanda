import type { Employee } from '@/lib/types/employee';

export interface DepartmentFilterOption {
  id: string;
  label: string;
}

export function buildDepartmentFilterOptions(
  departmentNames: readonly string[],
  employees: readonly Employee[],
): DepartmentFilterOption[] {
  const unique = new Set(departmentNames);

  employees.forEach((employee) => {
    const department = employee.department?.trim();
    if (department) {
      unique.add(department);
    }
  });

  return [
    { id: 'all', label: 'All departments' },
    ...Array.from(unique)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .map((name) => ({ id: name, label: name })),
  ];
}

export function filterEmployeesByDepartment(
  employees: readonly Employee[],
  departmentFilter: string,
): Employee[] {
  if (departmentFilter === 'all') return [...employees];
  return employees.filter((employee) => employee.department === departmentFilter);
}
