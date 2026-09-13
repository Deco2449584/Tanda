'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import { NewInspectionForm } from '@/components/inspections/NewInspectionForm';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useInspectionsAccess } from '@/hooks/useInspectionsAccess';

export default function NewInspectionPage() {
  const router = useRouter();
  const { loading, canCreate } = useInspectionsAccess();

  useEffect(() => {
    if (loading) return;
    if (!canCreate) {
      router.replace('/inspections');
    }
  }, [canCreate, loading, router]);

  if (loading || !canCreate) {
    return (
      <PageContent>
        <LoadingIndicator message="Loading…" />
      </PageContent>
    );
  }

  return (
    <PageContent className="space-y-6 pb-8">
      <div className="space-y-4">
        <Link
          href="/inspections"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to inspections
        </Link>

        <PageHeader
          eyebrow="Compliance"
          eyebrowIcon={ClipboardCheck}
          title="Register new inspection"
          description="Capture ULD / AWB details, commodity data, and evidence. GPS is recorded when you save."
        />
      </div>

      <NewInspectionForm />
    </PageContent>
  );
}
