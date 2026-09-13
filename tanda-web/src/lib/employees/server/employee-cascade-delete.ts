import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { deleteEmployeeAuth } from '@/lib/employees/sync-employee-auth';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import type {
  CascadeImpactItem,
  EmployeeCascadePreview,
} from '@/lib/types/cascade-delete';

export type { EmployeeCascadePreview };

const BATCH_SIZE = 400;

function safeCode(value: string): string {
  return value.trim().replace(/[^\w-]/g, '_');
}

function prefsDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[@.]/g, '_');
}

async function countByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  if (!value) return 0;
  const snapshot = await getAdminFirestore()
    .collection(collectionName)
    .where(field, '==', value)
    .count()
    .get();
  return snapshot.data().count;
}

async function deleteByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  if (!value) return 0;
  const db = getAdminFirestore();
  let deleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where(field, '==', value)
      .limit(BATCH_SIZE)
      .get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
  }

  return deleted;
}

async function countStoragePrefix(prefix: string): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const [files] = await bucket.getFiles({ prefix: normalized, maxResults: 1000 });
  return files.length;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const [files] = await bucket.getFiles({ prefix: normalized });
  let deleted = 0;
  for (const file of files) {
    await file.delete({ ignoreNotFound: true });
    deleted += 1;
  }
  return deleted;
}

async function deleteStorageFile(path: string): Promise<number> {
  const bucket = getAdminStorage().bucket();
  try {
    await bucket.file(path).delete({ ignoreNotFound: true });
    return 1;
  } catch {
    return 0;
  }
}

async function loadEmployee(employeeDocId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeDocId)
    .get();

  if (!snapshot.exists) {
    throw new Error('Employee not found.');
  }

  const data = snapshot.data() ?? {};
  const role = resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });

  if (role === 'master') {
    throw new Error('Master accounts cannot be deleted.');
  }

  return {
    id: snapshot.id,
    name: typeof data.name === 'string' ? data.name : 'Employee',
    employeeId: typeof data.employeeId === 'string' ? data.employeeId.trim() : '',
    email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : '',
    authUid: typeof data.authUid === 'string' ? data.authUid.trim() : '',
    role,
  };
}

export async function previewEmployeeCascadeDelete(
  employeeDocId: string,
): Promise<EmployeeCascadePreview> {
  const employee = await loadEmployee(employeeDocId);
  const code = employee.employeeId;
  const safe = safeCode(code);

  const [
    attendance,
    shifts,
    leave,
    justifications,
    enrollments,
    customValues,
    issueReports,
    notifications,
    kioskLogs,
    inspectionsCreated,
  ] = await Promise.all([
    countByField(COLLECTIONS.ATTENDANCE_RECORDS, 'employeeId', code),
    countByField(COLLECTIONS.SHIFTS, 'employeeId', code),
    countByField(COLLECTIONS.LEAVE_REQUESTS, 'employeeId', code),
    countByField(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS, 'employeeId', code),
    countByField(COLLECTIONS.COURSE_ENROLLMENTS, 'employeeDocId', employee.id),
    countByField(COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES, 'employeeDocId', employee.id),
    countByField(COLLECTIONS.ISSUE_REPORTS, 'employeeId', code),
    employee.email
      ? countByField(COLLECTIONS.NOTIFICATIONS, 'recipientEmail', employee.email)
      : Promise.resolve(0),
    countByField(COLLECTIONS.KIOSK_LOGIN_LOGS, 'kioskEmployeeDocId', employee.id),
    employee.authUid
      ? countByField(COLLECTIONS.CARGO_INSPECTIONS, 'userId', employee.authUid)
      : Promise.resolve(0),
  ]);

  const [avatarFiles, docFiles, attendanceFiles, evidenceFiles, issueFiles] =
    await Promise.all([
      code ? countStoragePrefix(`avatars/${safe}`) : Promise.resolve(0),
      code ? countStoragePrefix(`employee_documents/${safe}`) : Promise.resolve(0),
      code ? countStoragePrefix(`attendance/${safe}`) : Promise.resolve(0),
      code ? countStoragePrefix(`course_evidence/${safe}`) : Promise.resolve(0),
      code ? countStoragePrefix(`issue_reports/${safe}`) : Promise.resolve(0),
    ]);

  // Avatar is a single file, not a folder — count separately if prefix scan missed it
  let avatarCount = avatarFiles;
  if (code && avatarCount === 0) {
    const bucket = getAdminStorage().bucket();
    const [exists] = await bucket.file(`avatars/${safe}.webp`).exists();
    if (exists) avatarCount = 1;
  }

  const storageFiles =
    avatarCount + docFiles + attendanceFiles + evidenceFiles + issueFiles;

  const items: CascadeImpactItem[] = [
    { key: 'profile', label: 'Employee profile', count: 1, action: 'delete' },
    { key: 'auth', label: 'Sign-in account', count: employee.authUid || employee.email ? 1 : 0, action: 'delete' },
    { key: 'attendance', label: 'Attendance punches', count: attendance, action: 'delete' },
    { key: 'shifts', label: 'Scheduled shifts', count: shifts, action: 'delete' },
    { key: 'leave', label: 'Leave requests', count: leave, action: 'delete' },
    { key: 'justifications', label: 'Attendance justifications', count: justifications, action: 'delete' },
    { key: 'courses', label: 'Course enrollments', count: enrollments, action: 'delete' },
    { key: 'customFields', label: 'Custom field values', count: customValues, action: 'delete' },
    { key: 'issues', label: 'Issue reports', count: issueReports, action: 'delete' },
    { key: 'notifications', label: 'Notifications', count: notifications, action: 'delete' },
    { key: 'kioskLogs', label: 'Kiosk operator login logs', count: kioskLogs, action: 'delete' },
    { key: 'storage', label: 'Files (photo, documents, evidence)', count: storageFiles, action: 'delete' },
    {
      key: 'inspections',
      label: 'Cargo inspections created by this user (kept for records)',
      count: inspectionsCreated,
      action: 'keep',
    },
  ];

  const totalDeletedDocs = items
    .filter((item) => item.action === 'delete' && item.key !== 'storage' && item.key !== 'auth')
    .reduce((sum, item) => sum + item.count, 0);

  return {
    employeeDocId: employee.id,
    name: employee.name,
    employeeId: employee.employeeId,
    email: employee.email,
    items: items.filter((item) => item.count > 0 || item.key === 'profile'),
    totalDeletedDocs,
  };
}

export async function executeEmployeeCascadeDelete(
  employeeDocId: string,
): Promise<EmployeeCascadePreview> {
  const preview = await previewEmployeeCascadeDelete(employeeDocId);
  const employee = await loadEmployee(employeeDocId);
  const code = employee.employeeId;
  const safe = safeCode(code);

  if (code) {
    await Promise.all([
      deleteStorageFile(`avatars/${safe}.webp`),
      deleteStoragePrefix(`employee_documents/${safe}`),
      deleteStoragePrefix(`attendance/${safe}`),
      deleteStoragePrefix(`course_evidence/${safe}`),
      deleteStoragePrefix(`issue_reports/${safe}`),
    ]);
  }

  await deleteByField(COLLECTIONS.ATTENDANCE_RECORDS, 'employeeId', code);
  await deleteByField(COLLECTIONS.SHIFTS, 'employeeId', code);
  await deleteByField(COLLECTIONS.LEAVE_REQUESTS, 'employeeId', code);
  await deleteByField(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS, 'employeeId', code);
  await deleteByField(COLLECTIONS.COURSE_ENROLLMENTS, 'employeeDocId', employee.id);
  await deleteByField(COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES, 'employeeDocId', employee.id);
  await deleteByField(COLLECTIONS.ISSUE_REPORTS, 'employeeId', code);
  await deleteByField(COLLECTIONS.KIOSK_LOGIN_LOGS, 'kioskEmployeeDocId', employee.id);

  if (employee.email) {
    await deleteByField(COLLECTIONS.NOTIFICATIONS, 'recipientEmail', employee.email);
    await getAdminFirestore()
      .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
      .doc(prefsDocId(employee.email))
      .delete()
      .catch(() => undefined);
  }

  if (employee.authUid) {
    await getAdminFirestore()
      .collection(COLLECTIONS.AUTH_SESSIONS)
      .doc(employee.authUid)
      .delete()
      .catch(() => undefined);
  }

  // Clear operator refs on attendance without deleting other people's punches
  {
    const db = getAdminFirestore();
    while (true) {
      const snapshot = await db
        .collection(COLLECTIONS.ATTENDANCE_RECORDS)
        .where('kioskOperatorEmployeeId', '==', employee.id)
        .limit(BATCH_SIZE)
        .get();
      if (snapshot.empty) break;
      const batch = db.batch();
      snapshot.docs.forEach((document) => {
        batch.update(document.ref, {
          kioskOperatorEmployeeId: FieldValue.delete(),
        });
      });
      await batch.commit();
      if (snapshot.size < BATCH_SIZE) break;
    }
  }

  await deleteEmployeeAuth(employeeDocId);
  await getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(employeeDocId).delete();

  return preview;
}
