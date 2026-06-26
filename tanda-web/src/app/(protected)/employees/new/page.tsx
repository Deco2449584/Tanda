'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CreateEmployeeForm } from '@/components/employees/CreateEmployeeForm';
import { PageContent } from '@/components/ui/PageContent';

export default function NewEmployeePage() {
  const router = useRouter();

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
          <h1 className="text-2xl font-bold text-white">Create employee</h1>
          <p className="mt-1 text-sm text-subtle">
            Add work details, personal information, and identity documents in one place.
          </p>
        </div>
      </div>

      <CreateEmployeeForm
        onCancel={() => router.push('/employees')}
        onSuccess={() => router.push('/employees')}
      />
    </PageContent>
  );
}
