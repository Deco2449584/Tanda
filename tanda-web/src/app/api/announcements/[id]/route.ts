import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import {
  deleteAnnouncement,
  employeeCanReadAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
} from '@/lib/announcements/server/announcements-service';
import { canPerformAction } from '@/lib/auth/admin-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';
import type { UpdateAnnouncementInput } from '@/lib/types/announcement';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const announcement = await getAnnouncementById(id);

    if (!announcement) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const authContext = await loadAdminAccessFromRequest(request);
    if (authContext) {
      return NextResponse.json({ announcement });
    }

    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const allowed = await employeeCanReadAnnouncement(id, employee.email);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('GET /api/announcements/[id]', error);
    return NextResponse.json(
      { error: 'Could not load announcement.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'announcements', 'update')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as Partial<UpdateAnnouncementInput>;
    const announcement = await updateAnnouncement(id, {
      title: body.title ?? '',
      body: body.body ?? '',
    });

    await recordAuditFromRequest(request, authContext.user, {
      action: 'announcement.updated',
      entityType: 'announcement',
      entityId: announcement.id,
      summary: `Updated announcement "${announcement.title}"`,
      after: {
        title: announcement.title,
      },
    });

    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not update announcement.';
    console.error('PATCH /api/announcements/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'announcements', 'delete')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await getAnnouncementById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    await deleteAnnouncement(id);

    await recordAuditFromRequest(request, authContext.user, {
      action: 'announcement.deleted',
      entityType: 'announcement',
      entityId: id,
      summary: `Deleted announcement "${existing.title}"`,
      before: {
        title: existing.title,
        audience: existing.audience,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not delete announcement.';
    console.error('DELETE /api/announcements/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
