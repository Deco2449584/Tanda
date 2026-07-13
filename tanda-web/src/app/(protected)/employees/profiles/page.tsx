'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import {
  EmployeeProfilesTable,
  type ProfileStatusFilter,
} from '@/components/employees/EmployeeProfilesTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { PersonalProfileStatus } from '@/lib/types/employee';

const STATUS_FILTERS: { value: ProfileStatusFilter; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'none', label: 'Not submitted' },
  { value: 'all', label: 'All' },
];

function parseStatusFilter(raw: string | null): ProfileStatusFilter {
  if (
    raw === 'all' ||
    raw === 'none' ||
    raw === 'Pending' ||
    raw === 'Approved' ||
    raw === 'Rejected'
  ) {
    return raw;
  }
  if (raw === 'pending') return 'Pending';
  if (raw === 'approved') return 'Approved';
  if (raw === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function EmployeeProfilesPage() {
  const searchParams = useSearchParams();
  const { employees, loading, refreshing, refresh } = useEmployees();
  const { canPerformAction } = useAdminAccess();
  const canReview = canPerformAction('employees', 'reviewProfile');
  const canUpdate = canPerformAction('employees', 'update');

  const initialFilter = parseStatusFilter(searchParams.get('status'));
  const [statusFilter, setStatusFilter] = useState<ProfileStatusFilter>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    const result: Record<PersonalProfileStatus | 'all', number> = {
      all: 0,
      none: 0,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
    };
    for (const employee of employees) {
      const role = (employee.role ?? 'empleado').trim().toLowerCase();
      if (role === 'kiosk' || role === 'master') continue;

      const status = employee.personalProfileStatus ?? 'none';
      const key =
        status === 'Pending' || status === 'Approved' || status === 'Rejected'
          ? status
          : 'none';
      result[key] += 1;
      result.all += 1;
    }
    return result;
  }, [employees]);

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Personal profiles"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/employees"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Employees
            </Link>
            <RefreshButton
              onClick={refresh}
              refreshing={refreshing}
              disabled={loading}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === option.value
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border text-muted hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              {option.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                {counts[option.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, or ID"
            className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <EmployeeProfilesTable
        employees={employees}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        canReview={canReview}
        canUpdate={canUpdate}
        onReviewed={refresh}
      />
    </PageContent>
  );
}
