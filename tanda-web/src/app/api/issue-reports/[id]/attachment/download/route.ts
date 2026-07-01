import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { canAccessPath } from '@/lib/auth/admin-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { getAdminStorage } from '@/lib/firebase-admin';
import { getIssueReportById } from '@/lib/issues/server/issue-reports-service';
import { extractStoragePathFromUrl } from '@/lib/portal/storage-path';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseAttachmentFileName(storagePath: string, subject: string): string {
  const fromPath = storagePath.split('/').pop()?.split('?')[0];
  if (fromPath) return fromPath;

  const safeSubject = subject
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return `${safeSubject || 'issue-attachment'}.webp`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const report = await getIssueReportById(id);

    if (!report) {
      return NextResponse.json({ error: 'Issue report not found.' }, { status: 404 });
    }

    if (!report.attachmentUrl?.trim() && !report.attachmentPath?.trim()) {
      return NextResponse.json({ error: 'No attachment found.' }, { status: 404 });
    }

    const admin = await verifyAdminRequest(request);
    if (!admin) {
      const employee = await loadEmployeeContext(request);
      if (!employee) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
      }

      if (report.reporterEmail.trim().toLowerCase() !== employee.email.trim().toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    } else {
      const authContext = await loadAdminAccessFromRequest(request);
      if (!authContext || !canAccessPath(authContext.access, '/issue-reports')) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    const storagePath =
      report.attachmentPath?.trim() ||
      extractStoragePathFromUrl(report.attachmentUrl ?? '');

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Could not resolve attachment storage path.' },
        { status: 400 },
      );
    }

    const bucket = getAdminStorage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Attachment file not found.' }, { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const fileName = parseAttachmentFileName(storagePath, report.subject);
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': metadata.contentType || 'image/webp',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/issue-reports/[id]/attachment/download', error);
    return NextResponse.json(
      { error: 'Could not download attachment.' },
      { status: 500 },
    );
  }
}
