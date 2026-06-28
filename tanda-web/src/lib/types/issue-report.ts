import type { Timestamp } from 'firebase/firestore';

export const ISSUE_REPORT_STATUSES = ['open', 'in_progress', 'resolved'] as const;
export type IssueReportStatus = (typeof ISSUE_REPORT_STATUSES)[number];

export const ISSUE_REPORT_CATEGORIES = [
  'Bug / technical',
  'Attendance / kiosk',
  'Schedule',
  'Account / access',
  'Other',
] as const;
export type IssueReportCategory = (typeof ISSUE_REPORT_CATEGORIES)[number];

export interface IssueReportFirestore {
  reporterEmail: string;
  employeeId: string;
  employeeName: string;
  category: IssueReportCategory;
  subject: string;
  description: string;
  status: IssueReportStatus;
  attachmentUrl?: string;
  attachmentPath?: string;
  adminNotes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
}

export interface IssueReport extends IssueReportFirestore {
  id: string;
}

export interface CreateIssueReportInput {
  category: IssueReportCategory;
  subject: string;
  description: string;
  attachmentUrl?: string;
  attachmentPath?: string;
}

export interface UpdateIssueReportInput {
  status?: IssueReportStatus;
  adminNotes?: string;
}
