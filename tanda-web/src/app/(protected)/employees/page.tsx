'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { Employee } from '@/lib/types/employee';

export default function EmployeesPage() {
  const router = useRouter();
  const { employees, loading } = useEmployees();
  const { canEditModule } = useAdminAccess();
  const canEditEmployees = canEditModule('employees');
  const [searchQuery, setSearchQuery] = useState('');

  function handleEdit(employee: Employee) {
    router.push(`/employees/${employee.id}/edit`);
  }

  return (
    <PageContent className="space-y-6">
      <PageHeader title="Staff Management" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {canEditEmployees ? (
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

        <div className="relative w-full sm:max-w-xs">
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

      <EmployeeTable
        employees={employees}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={canEditEmployees ? handleEdit : undefined}
      />
    </PageContent>
  );
}
