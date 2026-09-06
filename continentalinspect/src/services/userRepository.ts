import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebaseConfig';
import type { EmployeeProfile, EmployeeRecord, UserRole } from '@/types/auth';

const EMPLOYEES_COLLECTION = 'employees';

const ADMIN_DEPARTMENTS = new Set(['logistica', 'admin']);

export class EmployeeAccessError extends Error {
  readonly code:
    | 'not_found'
    | 'inactive'
    | 'inspect_disabled'
    | 'no_email'
    | 'firestore_unavailable';

  constructor(code: EmployeeAccessError['code'], message: string) {
    super(message);
    this.name = 'EmployeeAccessError';
    this.code = code;
  }
}

function parseAdminEmails(): string[] {
  return (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getConfiguredAdminEmails(): string[] {
  return parseAdminEmails();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().includes(email.trim().toLowerCase());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEmployeeRecord(raw: Record<string, unknown>): EmployeeRecord | null {
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (!email) return null;

  return {
    email,
    active: raw.active === true,
    continentalInspectEnabled: raw.continentalInspectEnabled === true,
    continentalInspectAdmin: raw.continentalInspectAdmin === true,
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    department: typeof raw.department === 'string' ? raw.department.trim() : '',
    employeeId: typeof raw.employeeId === 'string' ? raw.employeeId.trim() : '',
    photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl.trim() : undefined,
    locationId:
      typeof raw.locationId === 'string' && raw.locationId.trim()
        ? raw.locationId.trim()
        : undefined,
    locationGroupId:
      typeof raw.locationGroupId === 'string' && raw.locationGroupId.trim()
        ? raw.locationGroupId.trim()
        : undefined,
    workforceRole:
      typeof raw.role === 'string' && raw.role.trim() ? raw.role.trim() : undefined,
  };
}

/** Master always has Inspect access; others need the TimeTracker toggle. */
export function hasContinentalInspectAccess(record: EmployeeRecord): boolean {
  const workforceRole = record.workforceRole?.trim().toLowerCase() ?? '';
  if (workforceRole === 'master') {
    return true;
  }
  return record.continentalInspectEnabled === true;
}

/** Admin: master, Inspect-admin flag, email allowlist, or logistics/admin department. */
export function resolveRoleFromEmployee(
  employee:
    | Pick<EmployeeRecord, 'department' | 'workforceRole' | 'continentalInspectAdmin'>
    | null
    | undefined,
  email: string | null | undefined,
): UserRole {
  const workforceRole = employee?.workforceRole?.trim().toLowerCase() ?? '';
  if (workforceRole === 'master') return 'admin';
  if (employee?.continentalInspectAdmin === true) return 'admin';
  if (isAdminEmail(email)) return 'admin';
  const dept = employee?.department?.toLowerCase().trim() ?? '';
  if (ADMIN_DEPARTMENTS.has(dept)) return 'admin';
  return 'operator';
}

export function resolveUserRole(
  email: string | null | undefined,
  profile: EmployeeProfile | null | undefined,
): UserRole {
  if (!email && !profile) return 'operator';
  return resolveRoleFromEmployee(profile, email ?? profile?.email);
}

function toEmployeeProfile(docId: string, record: EmployeeRecord, email: string): EmployeeProfile {
  return {
    docId,
    ...record,
    email: record.email || email,
    role: resolveRoleFromEmployee(record, email),
  };
}

async function findEmployeeDocForAuth(
  email: string,
  authUid: string,
): Promise<{ docId: string; record: EmployeeRecord } | null> {
  if (!db) return null;

  const normalized = normalizeEmail(email);

  const byUid = await getDoc(doc(db, EMPLOYEES_COLLECTION, authUid));
  if (byUid.exists()) {
    const record = parseEmployeeRecord(byUid.data() as Record<string, unknown>);
    if (record && normalizeEmail(record.email) === normalized) {
      return { docId: byUid.id, record };
    }
  }

  const snapshot = await getDocs(
    query(
      collection(db, EMPLOYEES_COLLECTION),
      where('email', '==', normalized),
      limit(1),
    ),
  );

  if (snapshot.empty) return null;

  const document = snapshot.docs[0];
  const record = parseEmployeeRecord(document.data() as Record<string, unknown>);
  if (!record) return null;

  return { docId: document.id, record };
}

export { findEmployeeDocForAuth };

export type LoadEmployeeProfileResult = {
  profile: EmployeeProfile;
  syncedToFirestore: boolean;
};

/**
 * Loads and validates the signed-in user against `employees`.
 * @throws {EmployeeAccessError} when not found, inactive, or Firestore unavailable
 */
export async function loadEmployeeProfile(
  authUid: string,
  email: string | null | undefined,
): Promise<LoadEmployeeProfileResult> {
  if (!db) {
    throw new EmployeeAccessError(
      'firestore_unavailable',
      'Firestore is not configured.',
    );
  }

  if (!email?.trim()) {
    throw new EmployeeAccessError('no_email', 'Account has no email address.');
  }

  const found = await findEmployeeDocForAuth(email, authUid);
  if (!found) {
    throw new EmployeeAccessError(
      'not_found',
      'No employee record found for this account.',
    );
  }

  if (!found.record.active) {
    throw new EmployeeAccessError(
      'inactive',
      'This employee account is not active.',
    );
  }

  if (!hasContinentalInspectAccess(found.record)) {
    throw new EmployeeAccessError(
      'inspect_disabled',
      'Continental Inspect access is not enabled for this employee.',
    );
  }

  return {
    profile: toEmployeeProfile(found.docId, found.record, email),
    syncedToFirestore: true,
  };
}

/** @deprecated Use loadEmployeeProfile */
export async function ensureUserProfile(user: User): Promise<LoadEmployeeProfileResult> {
  return loadEmployeeProfile(user.uid, user.email);
}

export function getRoleLabel(role: UserRole): string {
  return role === 'admin' ? 'Administrator' : 'Operator';
}

export type ManagedEmployee = {
  docId: string;
  /** Same as docId — kept for legacy UI code */
  uid: string;
  email: string;
  active: boolean;
  name: string;
  department: string;
  employeeId: string;
  photoUrl: string;
  role: UserRole;
};

/** @deprecated Use ManagedEmployee */
export type ManagedUser = ManagedEmployee;

function mapManagedEmployee(
  docId: string,
  record: EmployeeRecord,
): ManagedEmployee {
  return {
    docId,
    uid: docId,
    email: record.email,
    active: record.active,
    name: record.name,
    department: record.department,
    employeeId: record.employeeId,
    photoUrl: record.photoUrl ?? '',
    role: resolveRoleFromEmployee(record, record.email),
  };
}

/** Lists employees once (prefer subscribeToAllEmployees for admin UI). */
export async function fetchAllEmployees(): Promise<ManagedEmployee[]> {
  if (!db) return [];

  try {
    const snapshot = await getDocs(
      query(collection(db, EMPLOYEES_COLLECTION), orderBy('email')),
    );
    return mapEmployeeSnapshot(snapshot.docs);
  } catch {
    return [];
  }
}

function mapEmployeeSnapshot(
  docs: { id: string; data: () => Record<string, unknown> }[],
): ManagedEmployee[] {
  return docs
    .map((document) => {
      const record = parseEmployeeRecord(document.data());
      return record ? mapManagedEmployee(document.id, record) : null;
    })
    .filter((item): item is ManagedEmployee => item !== null);
}

/** Real-time employee list for admin screens (avoids repeated getDocs). */
export function subscribeToAllEmployees(
  onData: (employees: ManagedEmployee[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError?.(new Error('Firestore is not configured.'));
    return () => {};
  }

  return onSnapshot(
    query(collection(db, EMPLOYEES_COLLECTION), orderBy('email')),
    (snapshot) => {
      onData(mapEmployeeSnapshot(snapshot.docs));
    },
    (error) => {
      onError?.(error);
    },
  );
}

/** @deprecated Use fetchAllEmployees */
export async function fetchAllUsers(): Promise<ManagedEmployee[]> {
  return fetchAllEmployees();
}

/** Promote/demote app access by department (admin departments grant admin UI). */
export async function updateEmployeeDepartment(
  docId: string,
  department: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  await updateDoc(doc(db, EMPLOYEES_COLLECTION, docId), {
    department: department.trim(),
  });
}

export type EmployeeProfileUpdates = Pick<EmployeeRecord, 'name' | 'department' | 'employeeId'>;

/** Updates editable employee fields on the Firestore `employees` document. */
export async function updateEmployeeProfile(
  docId: string,
  updates: EmployeeProfileUpdates,
): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  await updateDoc(doc(db, EMPLOYEES_COLLECTION, docId), {
    name: updates.name.trim(),
    department: updates.department.trim(),
    employeeId: updates.employeeId.trim(),
  });
}

/**
 * Real-time listener for the signed-in employee document (`employees` collection).
 * Invokes `onRecord(null)` when the doc is missing.
 */
export function subscribeToEmployeeRecord(
  docId: string,
  onRecord: (record: EmployeeRecord | null) => void,
): Unsubscribe {
  if (!db) {
    return () => {};
  }

  return onSnapshot(
    doc(db, EMPLOYEES_COLLECTION, docId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onRecord(null);
        return;
      }
      onRecord(parseEmployeeRecord(snapshot.data() as Record<string, unknown>));
    },
    () => {
      onRecord(null);
    },
  );
}

/** @deprecated Use updateEmployeeDepartment */
export async function updateUserRole(docId: string, role: UserRole): Promise<void> {
  const department = role === 'admin' ? 'logistica' : 'operations';
  await updateEmployeeDepartment(docId, department);
}

/** Deactivates an employee instead of deleting the document. */
export async function deactivateEmployee(docId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not configured.');
  await updateDoc(doc(db, EMPLOYEES_COLLECTION, docId), { active: false });
}

/** @deprecated Use deactivateEmployee */
export async function deleteUserProfile(docId: string): Promise<void> {
  await deactivateEmployee(docId);
}
