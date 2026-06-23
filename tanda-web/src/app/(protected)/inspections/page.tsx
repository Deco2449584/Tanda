import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { Suspense } from 'react';
import { InspectionsPageClient } from '@/components/inspections/InspectionsPageClient';
import { PageContent } from '@/components/ui/PageContent';

export default function InspectionsPage() {
  return (
    <Suspense
      fallback={
        <PageContent>
          <LoadingIndicator />
        </PageContent>
      }
    >
      <InspectionsPageClient />
    </Suspense>
  );
}
