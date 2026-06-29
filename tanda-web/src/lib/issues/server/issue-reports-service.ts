import { FieldValue } from 'firebase-admin/firestore';
import { mapIssueReportDoc, serializeIssueReport } from '@/lib/issues/map-issue-report';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  CreateIssueReportInput,
  IssueReport,
  UpdateIssueReportInput,
} from '@/lib/types/issue-report';
import { ISSUE_REPORT_CATEGORIES } from '@/lib/types/issue-report';

function parseCategory(value: string): CreateIssueReportInput['category'] {
  const trimmed = value.trim();
  if ((ISSUE_REPORT_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CreateIssueReportInput['category'];
  }
  return 'Other';
}

export async function createIssueReport(input: {
  payload: CreateIssueReportInput;
  reporterEmail: string;
  employeeId: string;
  employeeName: string;
}): Promise<IssueReport> {
  const subject = input.payload.subject.trim();
  const description = input.payload.description.trim();

  if (!subject) {
    throw new Error('Subject is required.');
  }
  if (!description) {
    throw new Error('Description is required.');
  }

  const ref = getAdminFirestore().collection(COLLECTIONS.ISSUE_REPORTS).doc();

  const payload: Record<string, unknown> = {
    reporterEmail: input.reporterEmail.trim().toLowerCase(),
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    category: parseCategory(input.payload.category),
    subject,
    description,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.payload.attachmentUrl?.trim()) {
    payload.attachmentUrl = input.payload.attachmentUrl.trim();
  }
  if (input.payload.attachmentPath?.trim()) {
    payload.attachmentPath = input.payload.attachmentPath.trim();
  }

  await ref.set(payload);

  const snapshot = await ref.get();
  return mapIssueReportDoc(snapshot.id, snapshot.data() ?? {});
}

export async function listIssueReportsForReporter(
  reporterEmail: string,
): Promise<IssueReport[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ISSUE_REPORTS)
    .where('reporterEmail', '==', reporterEmail.trim().toLowerCase())
    .get();

  return snapshot.docs
    .map((document) => mapIssueReportDoc(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function listAllIssueReports(): Promise<IssueReport[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ISSUE_REPORTS)
    .get();

  return snapshot.docs
    .map((document) => mapIssueReportDoc(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function updateIssueReport(
  id: string,
  input: UpdateIssueReportInput,
): Promise<IssueReport> {
  const ref = getAdminFirestore().collection(COLLECTIONS.ISSUE_REPORTS).doc(id.trim());
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error('Issue report not found.');
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.status === 'open' || input.status === 'in_progress' || input.status === 'resolved') {
    update.status = input.status;
    if (input.status === 'resolved') {
      update.resolvedAt = FieldValue.serverTimestamp();
    }
  }

  if (typeof input.adminNotes === 'string') {
    update.adminNotes = input.adminNotes.trim();
  }

  if (typeof input.subject === 'string') {
    const subject = input.subject.trim();
    if (!subject) throw new Error('Subject is required.');
    update.subject = subject;
  }

  if (typeof input.description === 'string') {
    const description = input.description.trim();
    if (!description) throw new Error('Description is required.');
    update.description = description;
  }

  if (typeof input.category === 'string' && input.category.trim()) {
    update.category = parseCategory(input.category);
  }

  await ref.update(update);

  const snapshot = await ref.get();
  return mapIssueReportDoc(snapshot.id, snapshot.data() ?? {});
}

export function serializeIssueReports(reports: IssueReport[]) {
  return reports.map(serializeIssueReport);
}

export async function deleteIssueReport(id: string): Promise<void> {
  const ref = getAdminFirestore().collection(COLLECTIONS.ISSUE_REPORTS).doc(id.trim());
  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error('Issue report not found.');
  }
  await ref.delete();
}
