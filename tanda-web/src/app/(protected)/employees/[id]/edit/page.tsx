'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { canEditStaffAccount } from '@/lib/employees/is-protected-admin';
import { useEmployees } from '@/providers/EmployeesProvider';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeDocId = typeof params.id === 'string' ? params.id : '';
  const { employees, loading: employeesLoading } = useEmployees();
  const {
    loading: accessLoading,
    isMaster,
    canAccessModule,
    canPerformAction,
  } = useAdminAccess();
  const canUpdate = canPerformAction('employees', 'update');

  const employee = employees.find((item) => item.id === employeeDocId) ?? null;
  const loading = employeesLoading || accessLoading;
  const canEditThisAccount =
    Boolean(employee) && canEditStaffAccount(isMaster, employee);

  useEffect(() => {
    if (accessLoading || employeesLoading) return;
    if (!canAccessModule('employees') || !canUpdate) {
      router.replace('/employees');
      return;
    }
    if (employee && !canEditStaffAccount(isMaster, employee)) {
      router.replace('/employees');
    }
  }, [
    accessLoading,
    canAccessModule,
    canUpdate,
    employee,
    employeesLoading,
    isMaster,
    router,
  ]);

  if (loading || !canUpdate || (employee && !canEditThisAccount)) {
    return (
      <PageContent>
        <LoadingIndicator message="Loading…" />
      </PageContent>
    );
  }

  return (
    <PageContent className="mx-auto max-w-4xl space-y-6 pb-8">
      <PageHeader
        eyebrow="People"
        title={
          employee?.name?.trim() ? `Edit ${employee.name}` : 'Edit employee'
        }
        description="Update work details, personal information, and access settings. Empty fields can be filled in at any time."
        actions={
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to staff
          </Link>
        }
      />

      {employeesLoading ? (
        <LoadingIndicator message="Loading employee…" className="h-64" />
      ) : !employee ? (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          Employee not found. Check the link or return to the staff list.
        </p>
      ) : (
        <EmployeeForm
          employee={employee}
          onCancel={() => router.push('/employees')}
          onSuccess={(kind) =>
            router.push(`/employees?toast=updated&kind=${encodeURIComponent(kind)}`)
          }
        />
      )}
    </PageContent>
  );
}
