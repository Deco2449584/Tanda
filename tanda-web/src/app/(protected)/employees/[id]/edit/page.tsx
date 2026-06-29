'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useEmployees } from '@/providers/EmployeesProvider';

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeDocId = typeof params.id === 'string' ? params.id : '';
  const { employees, loading: employeesLoading } = useEmployees();
  const { loading: accessLoading, canAccessModule, canPerformAction } = useAdminAccess();
  const canUpdate = canPerformAction('employees', 'update');

  const employee = employees.find((item) => item.id === employeeDocId) ?? null;
  const loading = employeesLoading || accessLoading;

  useEffect(() => {
    if (accessLoading) return;
    if (!canAccessModule('employees') || !canUpdate) {
      router.replace('/employees');
    }
  }, [accessLoading, canAccessModule, canUpdate, router]);

  if (loading || !canUpdate) {
    return (
      <PageContent>
        <LoadingIndicator message="Loading…" />
      </PageContent>
    );
  }

  return (
    <PageContent className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="space-y-3">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 text-sm text-subtle transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to staff
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">
            {employee?.name?.trim() ? `Edit ${employee.name}` : 'Edit employee'}
          </h1>
          <p className="mt-1 text-sm text-subtle">
            Update work details, personal information, and access settings. Empty fields can
            be filled in at any time.
          </p>
        </div>
      </div>

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
          onSuccess={() => router.push('/employees')}
        />
      )}
    </PageContent>
  );
}
