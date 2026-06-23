import { Suspense } from 'react';
import { InspectionsPageClient } from '@/components/inspections/InspectionsPageClient';
import { PageContent } from '@/components/ui/PageContent';

export default function InspectionsPage() {
  return (
    <Suspense
      fallback={
        <PageContent>
          <p className="text-sm text-muted">Loading inspections…</p>
        </PageContent>
      }
    >
      <InspectionsPageClient />
    </Suspense>
  );
}
