'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users } from 'lucide-react';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEmployees } from '@/providers/EmployeesProvider';
import {
  EMPLOYEE_ACCESS_FILTER_OPTIONS,
  matchesEmployeeAccessFilter,
  type EmployeeAccessFilter,
} from '@/lib/employees/employee-access-filter';
import type { Employee } from '@/lib/types/employee';

export default function EmployeesPage() {
  const router = useRouter();
  const { employees, loading, refreshing, refresh } = useEmployees();
  const { canPerformAction } = useAdminAccess();
  const canCreateEmployees = canPerformAction('employees', 'create');
  const canUpdateEmployees = canPerformAction('employees', 'update');
  const canDeleteEmployees = canPerformAction('employees', 'delete');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState<EmployeeAccessFilter>('all');

  const filteredEmployees = useMemo(
    () => employees.filter((employee) => matchesEmployeeAccessFilter(employee, accessFilter)),
    [employees, accessFilter],
  );

  function handleEdit(employee: Employee) {
    router.push(`/employees/${employee.id}/edit`);
  }

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Staff Management"
        actions={
          <RefreshButton
            onClick={refresh}
            refreshing={refreshing}
            disabled={loading}
          />
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {canCreateEmployees ? (
          <Link
            href="/employees/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            CREATE NEW EMPLOYEE
          </Link>
        ) : (
          <div />
        )}

        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-44 sm:shrink-0">
            <Users
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <select
              value={accessFilter}
              onChange={(event) =>
                setAccessFilter(event.target.value as EmployeeAccessFilter)
              }
              className="w-full appearance-none rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              aria-label="Filter by employee type"
            >
              {EMPLOYEE_ACCESS_FILTER_OPTIONS.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  className="bg-surface-raised"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:min-w-0 sm:flex-1">
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
      </div>

      <EmployeeTable
        employees={filteredEmployees}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={canUpdateEmployees ? handleEdit : undefined}
        canDelete={canDeleteEmployees}
      />
    </PageContent>
  );
}
