import type { IssueReport, IssueReportFirestore } from '@/lib/types/issue-report';
import { ISSUE_REPORT_CATEGORIES, ISSUE_REPORT_STATUSES } from '@/lib/types/issue-report';

function parseCategory(value: unknown): IssueReport['category'] {
  if (
    typeof value === 'string' &&
    (ISSUE_REPORT_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as IssueReport['category'];
  }
  return 'Other';
}

function parseStatus(value: unknown): IssueReport['status'] {
  if (
    typeof value === 'string' &&
    (ISSUE_REPORT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as IssueReport['status'];
  }
  return 'open';
}

export function mapIssueReportDoc(
  id: string,
  data: Record<string, unknown>,
): IssueReport {
  const record = data as Partial<IssueReportFirestore>;

  return {
    id,
    reporterEmail:
      typeof record.reporterEmail === 'string' ? record.reporterEmail : '',
    employeeId: typeof record.employeeId === 'string' ? record.employeeId : '',
    employeeName:
      typeof record.employeeName === 'string' ? record.employeeName : '',
    category: parseCategory(record.category),
    subject: typeof record.subject === 'string' ? record.subject : '',
    description: typeof record.description === 'string' ? record.description : '',
    status: parseStatus(record.status),
    attachmentUrl:
      typeof record.attachmentUrl === 'string' ? record.attachmentUrl : undefined,
    attachmentPath:
      typeof record.attachmentPath === 'string' ? record.attachmentPath : undefined,
    adminNotes: typeof record.adminNotes === 'string' ? record.adminNotes : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    resolvedAt: record.resolvedAt,
  };
}

export function serializeIssueReport(report: IssueReport) {
  return {
    ...report,
    createdAt: report.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: report.updatedAt?.toDate?.()?.toISOString() ?? null,
    resolvedAt: report.resolvedAt?.toDate?.()?.toISOString() ?? null,
  };
}
