import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminActionRequest } from '@/lib/auth/verify-admin-action-request';
import {
  executeLocationCascadeDelete,
  previewLocationCascadeDelete,
} from '@/lib/locations/server/location-cascade-delete';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const admin = await verifyAdminActionRequest(
      request,
      'settings',
      'deleteLocations',
    );
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const preview = await previewLocationCascadeDelete(id);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error('GET /api/locations/[id]/cascade', error);
    const message =
      error instanceof Error ? error.message : 'Could not load delete preview.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await verifyAdminActionRequest(
      request,
      'settings',
      'deleteLocations',
    );

    if (!actor) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const preview = await executeLocationCascadeDelete(id);

    await recordAuditFromRequest(request, actor, {
      action: 'location.deleted',
      entityType: 'settings',
      entityId: id,
      summary: `Cascade-deleted client ${preview.name}`,
      metadata: { items: preview.items },
    });

    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    console.error('DELETE /api/locations/[id]/cascade', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete client.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
