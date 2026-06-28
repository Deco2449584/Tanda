import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  serializeIssueReports,
  updateIssueReport,
} from '@/lib/issues/server/issue-reports-service';
import type { UpdateIssueReportInput } from '@/lib/types/issue-report';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateIssueReportInput;

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
