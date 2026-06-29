'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { PageContent } from '@/components/ui/PageContent';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { useAdminAccess } from '@/hooks/useAdminAccess';

export default function NewEmployeePage() {
  const router = useRouter();
  const { loading, canAccessModule, canPerformAction } = useAdminAccess();
  const canCreate = canPerformAction('employees', 'create');

  useEffect(() => {
    if (loading) return;
    if (!canAccessModule('employees') || !canCreate) {
      router.replace('/employees');
    }
  }, [canAccessModule, canCreate, loading, router]);

  if (loading || !canCreate) {
    return (
      <PageContent>
        <LoadingIndicator message="Loading…" />
      </PageContent>
    );
  }

  return (
    <PageContent className="mx-auto max-w-4xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Create employee</h1>
        <p className="mt-1 text-sm text-subtle">
          Add work details, personal information, and identity documents.
        </p>
      </div>

      <EmployeeForm
        onCancel={() => router.push('/employees')}
        onSuccess={() => router.push('/employees')}
      />
    </PageContent>
  );
}
