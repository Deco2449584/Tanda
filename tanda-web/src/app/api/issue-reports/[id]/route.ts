import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import {
  deleteIssueReport,
  serializeIssueReports,
  updateIssueReport,
} from '@/lib/issues/server/issue-reports-service';
import type { UpdateIssueReportInput } from '@/lib/types/issue-report';

function isTriageOnlyUpdate(body: UpdateIssueReportInput): boolean {
  return (
    body.subject === undefined &&
    body.description === undefined &&
    body.category === undefined
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateIssueReportInput;

    const requiredAction = isTriageOnlyUpdate(body) ? 'manage' : 'update';
    if (!canPerformAction(authContext.access, 'issueReports', requiredAction)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const report = await updateIssueReport(id, body);

    return NextResponse.json({
      ok: true,
      report: serializeIssueReports([report])[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update issue report.';
    console.error('PATCH /api/issue-reports/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'issueReports', 'delete')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    await deleteIssueReport(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete issue report.';
    console.error('DELETE /api/issue-reports/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
