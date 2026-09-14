import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminActionRequest } from '@/lib/auth/verify-admin-action-request';
import { deleteCargoInspection } from '@/lib/inspections/server/delete-inspection';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await verifyAdminActionRequest(
      request,
      'inspections',
      'delete',
    );
    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await deleteCargoInspection(id);

    await recordAuditFromRequest(request, actor, {
      action: 'inspection.deleted',
      entityType: 'system',
      entityId: id,
      summary: `Deleted cargo inspection ${result.uldId || id} (AWB ${result.awbNumber || '—'})`,
      metadata: {
        uldId: result.uldId,
        awbNumber: result.awbNumber,
        photoCount: result.photoCount,
        videoCount: result.videoCount,
        storageFilesDeleted: result.storageFilesDeleted,
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('DELETE /api/inspections/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete inspection.';
    const status = message === 'Inspection not found.' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
