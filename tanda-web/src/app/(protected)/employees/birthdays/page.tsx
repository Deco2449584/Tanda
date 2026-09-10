'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EmployeeBirthdaysCalendar } from '@/components/employees/EmployeeBirthdaysCalendar';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEmployees } from '@/providers/EmployeesProvider';

export default function EmployeeBirthdaysPage() {
  const { employees, loading, refreshing, refresh } = useEmployees();
  const { canPerformAction } = useAdminAccess();
  const canOpenEmployee = canPerformAction('employees', 'update');

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Birthday calendar"
        description="Yearly view of staff birthdays across Continental Cargo."
        actions={
          <>
            <Link
              href="/employees"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to staff
            </Link>
            <RefreshButton
              onClick={refresh}
              refreshing={refreshing}
              disabled={loading}
            />
          </>
        }
      />

      <EmployeeBirthdaysCalendar
        employees={employees}
        loading={loading}
        canOpenEmployee={canOpenEmployee}
      />
    </PageContent>
  );
}
