'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { InspectionDetailView } from '@/components/inspections/InspectionDetailView';
import { PageContent } from '@/components/ui/PageContent';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCargoInspections } from '@/providers/CargoInspectionsProvider';

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = params?.id ?? '';
  const { user, role } = useAuthRole();
  const isAdmin = role === 'admin';
  const { inspectionsById, loading, error, refresh } = useCargoInspections();

  const inspection = inspectionsById.get(inspectionId);

  if (loading) {
    return (
      <PageContent>
        <p className="text-sm text-muted">Loading inspection…</p>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent className="space-y-4">
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
        <Link href="/inspections" className="text-sm text-primary hover:underline">
          Back to inspections
        </Link>
      </PageContent>
    );
  }

  if (!inspection) {
    return (
      <PageContent className="space-y-4">
        <h1 className="text-lg font-semibold text-foreground">Inspection not found</h1>
        <p className="text-sm text-muted">
          This record may have been removed or you do not have access.
        </p>
        <Link href="/inspections" className="text-sm text-primary hover:underline">
          Back to inspections
        </Link>
      </PageContent>
    );
  }

  return (
    <PageContent className="max-w-4xl">
      <InspectionDetailView
        inspection={inspection}
        canEdit={isAdmin}
        editorEmail={user?.email ?? ''}
        onUpdated={() => void refresh()}
      />
    </PageContent>
  );
}
