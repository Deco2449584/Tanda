import { Suspense } from 'react';
import { InspectionsPageClient } from '@/components/inspections/InspectionsPageClient';

export default function InspectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6">
          <p className="text-sm text-zinc-500">Loading inspections...</p>
        </div>
      }
    >
      <InspectionsPageClient />
    </Suspense>
  );
}
