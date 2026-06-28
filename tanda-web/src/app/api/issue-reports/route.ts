import { NextResponse } from 'next/server';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  createIssueReport,
  listAllIssueReports,
  listIssueReportsForReporter,
  serializeIssueReports,
} from '@/lib/issues/server/issue-reports-service';
import type { CreateIssueReportInput } from '@/lib/types/issue-report';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (admin) {
      const reports = await listAllIssueReports();
      return NextResponse.json({ reports: serializeIssueReports(reports) });
    }

    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const reports = await listIssueReportsForReporter(employee.email);
    return NextResponse.json({ reports: serializeIssueReports(reports) });
  } catch (error) {
    console.error('GET /api/issue-reports', error);
    return NextResponse.json({ error: 'Could not load issue reports.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!employee.employeeId) {
      return NextResponse.json({ error: 'Employee code missing.' }, { status: 400 });
    }

    const body = (await request.json()) as CreateIssueReportInput;
    const report = await createIssueReport({
      payload: body,
      reporterEmail: employee.email,
      employeeId: employee.employeeId,
      employeeName: employee.name,
    });

    return NextResponse.json({
      ok: true,
      report: serializeIssueReports([report])[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit issue report.';
    console.error('POST /api/issue-reports', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
