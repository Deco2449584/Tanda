import { CalendarPlus } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import type { Employee } from '@/lib/types/employee';

interface AvailableEmployeesPanelProps {
  employees: Employee[];
}

export function AvailableEmployeesPanel({ employees }: AvailableEmployeesPanelProps) {
  return (
    <aside className="flex h-full flex-col rounded-xl border border-border bg-surface-raised/50 backdrop-blur-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Available employees</h2>
        <p className="mt-0.5 text-xs text-subtle">{employees.length} active</p>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {employees.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-subtle">
            No active employees.
          </p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-hover/50"
            >
              <EmployeeAvatar
                name={employee.name}
                photoUrl={employee.photoUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {employee.name}
                </p>
                <p className="truncate text-[11px] text-subtle">
                  {employee.employeeId} · {employee.department}
                </p>
              </div>
              <CalendarPlus className="h-4 w-4 shrink-0 text-subtle" />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
