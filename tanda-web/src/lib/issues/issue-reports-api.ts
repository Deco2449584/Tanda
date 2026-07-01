import { auth } from '@/lib/firebase';
import type { CreateIssueReportInput, UpdateIssueReportInput } from '@/lib/types/issue-report';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface SerializedIssueReport {
  id: string;
  reporterEmail: string;
  employeeId: string;
  employeeName: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  attachmentUrl?: string;
  adminNotes?: string;
  createdAt: string | null;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export async function fetchIssueReports(): Promise<SerializedIssueReport[]> {
  const response = await fetch('/api/issue-reports', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    reports?: SerializedIssueReport[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load issue reports.');
  }
  return data?.reports ?? [];
}

export async function createIssueReportRequest(
  payload: CreateIssueReportInput,
): Promise<SerializedIssueReport> {
  const response = await fetch('/api/issue-reports', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    report?: SerializedIssueReport;
    error?: string;
  } | null;
  if (!response.ok || !data?.report) {
    throw new Error(data?.error ?? 'Could not submit issue report.');
  }
  return data.report;
}

export async function updateIssueReportRequest(
  id: string,
  payload: UpdateIssueReportInput,
): Promise<SerializedIssueReport> {
  const response = await fetch(`/api/issue-reports/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    report?: SerializedIssueReport;
    error?: string;
  } | null;
  if (!response.ok || !data?.report) {
    throw new Error(data?.error ?? 'Could not update issue report.');
  }
  return data.report;
}

export async function deleteIssueReportRequest(id: string): Promise<void> {
  const response = await fetch(`/api/issue-reports/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not delete issue report.');
  }
}

function parseDownloadFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export async function downloadIssueReportAttachment(reportId: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');

  const token = await user.getIdToken();
  const response = await fetch(
    `/api/issue-reports/${encodeURIComponent(reportId)}/attachment/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not download image.');
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download =
    parseDownloadFileName(response.headers.get('Content-Disposition')) ??
    'issue-attachment.webp';
  link.click();
  URL.revokeObjectURL(blobUrl);
}
