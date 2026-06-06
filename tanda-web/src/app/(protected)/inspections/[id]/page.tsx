'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { InspectionDetailView } from '@/components/inspections/InspectionDetailView';
import { getRoleFromEmail } from '@/lib/auth/roles';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCargoInspections } from '@/providers/CargoInspectionsProvider';

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const inspectionId = params?.id ?? '';
  const { user } = useAuthRole();
  const isAdmin = getRoleFromEmail(user?.email) === 'admin';
  const { inspectionsById, loading, error, refresh } = useCargoInspections();

  const inspection = inspectionsById.get(inspectionId);

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-zinc-500">Loading inspection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
        <Link href="/inspections" className="text-sm text-primary hover:underline">
          Back to inspections
        </Link>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <h1 className="text-lg font-bold text-white">Inspection not found</h1>
        <p className="text-sm text-zinc-500">
          This record may have been removed or you do not have access.
        </p>
        <Link href="/inspections" className="text-sm text-primary hover:underline">
          Back to inspections
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <InspectionDetailView
        inspection={inspection}
        canEdit={isAdmin}
        editorEmail={user?.email ?? ''}
        onUpdated={() => void refresh()}
      />
    </div>
  );
}
