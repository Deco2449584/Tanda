import {
  FieldValue,
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminAuth, getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import {
  createEmptyPurgeResult,
  hasDateRangeFilter,
  purgeOptionsHasWork,
  purgeResultHasSuccess,
  type DataPurgeDateRange,
  type DataPurgeOptions,
  type DataPurgeResult,
  type PurgeProgressCallback,
} from '@/lib/admin/data-purge';

const BATCH_SIZE = 400;

type DateFieldKind = 'timestamp' | 'dateString';

function normalizeRange(range?: DataPurgeDateRange | null): {
  startDate: string | null;
  endDate: string | null;
} {
  const startDate = range?.startDate?.trim() || null;
  const endDate = range?.endDate?.trim() || null;
  return { startDate, endDate };
}

function toStartTimestamp(dateKey: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateKey}T00:00:00.000Z`));
}

function toEndTimestamp(dateKey: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateKey}T23:59:59.999Z`));
}

function fileTimeInRange(
  timeCreated: string | undefined,
  startDate: string | null,
  endDate: string | null,
): boolean {
  if (!timeCreated) return !startDate && !endDate;
  const ms = Date.parse(timeCreated);
  if (!Number.isFinite(ms)) return false;
  if (startDate) {
    const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
    if (ms < startMs) return false;
  }
  if (endDate) {
    const endMs = Date.parse(`${endDate}T23:59:59.999Z`);
    if (ms > endMs) return false;
  }
  return true;
}

async function deleteCollectionDocuments(
  collectionName: string,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  let totalDeleted = 0;

  while (true) {
    const snapshot = await db.collection(collectionName).limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    totalDeleted += snapshot.size;
    onProgress?.(
      `Deleted ${totalDeleted} document${totalDeleted === 1 ? '' : 's'} from ${collectionName}…`,
    );

    if (snapshot.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

/**
 * Deletes docs in a date window. When no range is set, deletes the whole collection.
 * `timestamp` fields use Firestore Timestamp; `dateString` uses YYYY-MM-DD string compare.
 */
async function deleteCollectionDocumentsInRange(
  collectionName: string,
  field: string,
  kind: DateFieldKind,
  range: DataPurgeDateRange | null | undefined,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  if (!hasDateRangeFilter(range)) {
    return deleteCollectionDocuments(collectionName, onProgress);
  }

  const { startDate, endDate } = normalizeRange(range);
  const db = getAdminFirestore();
  let totalDeleted = 0;

  while (true) {
    let query: Query = db.collection(collectionName);

    if (kind === 'timestamp') {
      if (startDate) query = query.where(field, '>=', toStartTimestamp(startDate));
      if (endDate) query = query.where(field, '<=', toEndTimestamp(endDate));
    } else {
      if (startDate) query = query.where(field, '>=', startDate);
      if (endDate) query = query.where(field, '<=', endDate);
    }

    const snapshot = await query.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();

    totalDeleted += snapshot.size;
    onProgress?.(
      `Deleted ${totalDeleted} document${totalDeleted === 1 ? '' : 's'} from ${collectionName} (date filter)…`,
    );

    if (snapshot.size < BATCH_SIZE) break;
  }

  return totalDeleted;
}

/**
 * Master-data collections: date filter does not apply — wipe all when selected.
 */
async function deleteCollectionIgnoringDateFilter(
  collectionName: string,
  range: DataPurgeDateRange | null | undefined,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  if (hasDateRangeFilter(range)) {
    onProgress?.(
      `Date filter ignored for ${collectionName} (master data) — deleting all selected docs…`,
    );
  }
  return deleteCollectionDocuments(collectionName, onProgress);
}

async function deleteStoragePrefix(
  rootPath: string,
  range: DataPurgeDateRange | null | undefined,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const prefix = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
  const [files] = await bucket.getFiles({ prefix });
  const { startDate, endDate } = normalizeRange(range);
  const filterActive = hasDateRangeFilter(range);

  onProgress?.(
    filterActive
      ? `Scanning storage folder "${rootPath}" (date filter)…`
      : `Scanning storage folder "${rootPath}"…`,
  );

  let deleted = 0;
  for (const file of files) {
    if (filterActive) {
      const [metadata] = await file.getMetadata();
      const timeCreated =
        typeof metadata.timeCreated === 'string' ? metadata.timeCreated : undefined;
      if (!fileTimeInRange(timeCreated, startDate, endDate)) continue;
    }

    await file.delete();
    deleted += 1;
    if (deleted % 25 === 0) {
      onProgress?.(`Deleted ${deleted} file${deleted === 1 ? '' : 's'} from storage…`);
    }
  }

  onProgress?.(
    `Finished storage cleanup for "${rootPath}" (${deleted} file${deleted === 1 ? '' : 's'}).`,
  );

  return deleted;
}

async function clearInspectionPortalAccess(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;

  while (true) {
    const snapshot = await db
      .collection(COLLECTIONS.CARGO_INSPECTIONS)
      .where('portalEnabled', '==', true)
      .limit(BATCH_SIZE)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        portalEnabled: false,
        portalClientId: FieldValue.delete(),
      });
    });
    await batch.commit();

    cleared += snapshot.size;
    onProgress?.(
      `Cleared portal access on ${cleared} inspection${cleared === 1 ? '' : 's'}…`,
    );

    if (snapshot.size < BATCH_SIZE) break;
  }

  return cleared;
}

async function resetAllEmployeePresence(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  let resetCount = 0;
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection(COLLECTIONS.EMPLOYEES).orderBy('__name__').limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        lastAction: 'none',
        lastTimestampServer: FieldValue.delete(),
      });
    });
    await batch.commit();

    resetCount += snapshot.size;
    cursor = snapshot.docs[snapshot.docs.length - 1];
    onProgress?.(`Reset presence for ${resetCount} employee${resetCount === 1 ? '' : 's'}…`);

    if (snapshot.size < BATCH_SIZE) break;
  }

  return resetCount;
}

async function clearEmployeeDocumentRefs(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection(COLLECTIONS.EMPLOYEES).orderBy('__name__').limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        passportUrl: FieldValue.delete(),
        passportFileName: FieldValue.delete(),
        visaUrl: FieldValue.delete(),
        visaFileName: FieldValue.delete(),
      });
    });
    await batch.commit();

    cleared += snapshot.size;
    cursor = snapshot.docs[snapshot.docs.length - 1];
    onProgress?.(
      `Cleared document refs on ${cleared} employee${cleared === 1 ? '' : 's'}…`,
    );

    if (snapshot.size < BATCH_SIZE) break;
  }

  return cleared;
}

async function clearEmployeeLocationRefs(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;
  let cursor: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection(COLLECTIONS.EMPLOYEES).orderBy('__name__').limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        locationId: FieldValue.delete(),
        locationGroupId: FieldValue.delete(),
      });
    });
    await batch.commit();

    cleared += snapshot.size;
    cursor = snapshot.docs[snapshot.docs.length - 1];
    onProgress?.(
      `Cleared location refs on ${cleared} employee${cleared === 1 ? '' : 's'}…`,
    );

    if (snapshot.size < BATCH_SIZE) break;
  }

  return cleared;
}

/**
 * Deletes Firebase Auth users whose email is not linked to an employee doc.
 * Never deletes the acting master's Auth account.
 */
async function deleteOrphanedAuthUsers(
  actorEmail: string | undefined,
  range: DataPurgeDateRange | null | undefined,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminFirestore();
  const auth = getAdminAuth();
  const employeeEmails = new Set<string>();

  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection(COLLECTIONS.EMPLOYEES).orderBy('__name__').limit(BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const email = doc.data()?.email;
      if (typeof email === 'string' && email.trim()) {
        employeeEmails.add(email.trim().toLowerCase());
      }
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < BATCH_SIZE) break;
  }

  const actor = actorEmail?.trim().toLowerCase() ?? '';
  const { startDate, endDate } = normalizeRange(range);
  const filterActive = hasDateRangeFilter(range);

  let deleted = 0;
  let pageToken: string | undefined;

  onProgress?.('Scanning Firebase Auth for orphaned users…');

  do {
    const list = await auth.listUsers(1000, pageToken);
    for (const user of list.users) {
      const email = user.email?.trim().toLowerCase() ?? '';
      if (!email) continue;
      if (actor && email === actor) continue;
      if (employeeEmails.has(email)) continue;

      if (filterActive) {
        const created = user.metadata.creationTime;
        if (!fileTimeInRange(created, startDate, endDate)) continue;
      }

      await auth.deleteUser(user.uid);
      deleted += 1;
      if (deleted % 10 === 0) {
        onProgress?.(
          `Deleted ${deleted} orphaned Auth user${deleted === 1 ? '' : 's'}…`,
        );
      }
    }
    pageToken = list.pageToken;
  } while (pageToken);

  onProgress?.(
    `Finished Auth orphan cleanup (${deleted} user${deleted === 1 ? '' : 's'}).`,
  );

  return deleted;
}

async function runStep(
  result: DataPurgeResult,
  label: string,
  run: () => Promise<number>,
  assign: (count: number) => void,
): Promise<void> {
  try {
    assign(await run());
  } catch (error) {
    result.errors.push(
      error instanceof Error ? error.message : `Could not complete: ${label}`,
    );
  }
}

export async function purgeOperationalDataAdmin(
  options: DataPurgeOptions,
  onProgress?: PurgeProgressCallback,
  dateRange?: DataPurgeDateRange | null,
  actorEmail?: string,
): Promise<DataPurgeResult> {
  const result = createEmptyPurgeResult();
  const range = dateRange ?? null;

  if (!purgeOptionsHasWork(options)) {
    throw new Error('Select at least one item to delete.');
  }

  if (hasDateRangeFilter(range)) {
    const { startDate, endDate } = normalizeRange(range);
    if (startDate && endDate && startDate > endDate) {
      throw new Error('Date filter: "From" must be on or before "To".');
    }
    onProgress?.(
      `Date filter active: ${startDate ?? '…'} → ${endDate ?? '…'} (operational data only).`,
    );
  }

  // Storage first where media pairs with Firestore docs.
  if (options.attendanceStorage) {
    await runStep(
      result,
      'attendance photos',
      () => deleteStoragePrefix('attendance', range, onProgress),
      (count) => {
        result.storageFilesDeleted += count;
      },
    );
  }

  if (options.employeeDocumentsStorage) {
    await runStep(
      result,
      'employee documents',
      () => deleteStoragePrefix('employee_documents', range, onProgress),
      (count) => {
        result.employeeDocumentsStorageDeleted = count;
      },
    );
  }

  if (options.issueReportsStorage) {
    await runStep(
      result,
      'issue report attachments',
      () => deleteStoragePrefix('issue_reports', range, onProgress),
      (count) => {
        result.issueReportsStorageDeleted = count;
      },
    );
  }

  if (options.helpTutorialsStorage) {
    await runStep(
      result,
      'help tutorial media',
      () => deleteStoragePrefix('help_tutorials', range, onProgress),
      (count) => {
        result.helpTutorialsStorageDeleted = count;
      },
    );
  }

  if (options.cargoInspectionsStorage) {
    await runStep(
      result,
      'cargo inspection media',
      () => deleteStoragePrefix('cargo_inspections', range, onProgress),
      (count) => {
        result.cargoInspectionsStorageDeleted = count;
      },
    );
  }

  if (options.courseEvidenceStorage) {
    await runStep(
      result,
      'course evidence',
      () => deleteStoragePrefix('course_evidence', range, onProgress),
      (count) => {
        result.courseEvidenceStorageDeleted = count;
      },
    );
  }

  // Operational Firestore collections (date-aware).
  if (options.attendanceRecords) {
    await runStep(
      result,
      'attendance records',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.ATTENDANCE_RECORDS,
          'timestampServer',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.attendanceRecordsDeleted = count;
      },
    );
  }

  if (options.shifts) {
    await runStep(
      result,
      'shifts',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.SHIFTS,
          'date',
          'dateString',
          range,
          onProgress,
        ),
      (count) => {
        result.shiftsDeleted = count;
      },
    );
  }

  if (options.leaveRequests) {
    await runStep(
      result,
      'leave requests',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.LEAVE_REQUESTS,
          'startDate',
          'dateString',
          range,
          onProgress,
        ),
      (count) => {
        result.leaveRequestsDeleted = count;
      },
    );
  }

  if (options.attendanceJustifications) {
    await runStep(
      result,
      'attendance justifications',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.ATTENDANCE_JUSTIFICATIONS,
          'date',
          'dateString',
          range,
          onProgress,
        ),
      (count) => {
        result.attendanceJustificationsDeleted = count;
      },
    );
  }

  if (options.notifications) {
    await runStep(
      result,
      'notifications',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.NOTIFICATIONS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.notificationsDeleted = count;
      },
    );
  }

  if (options.notificationPreferences) {
    await runStep(
      result,
      'notification preferences',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.NOTIFICATION_PREFERENCES,
          range,
          onProgress,
        ),
      (count) => {
        result.notificationPreferencesDeleted = count;
      },
    );
  }

  if (options.announcements) {
    await runStep(
      result,
      'announcements',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.ANNOUNCEMENTS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.announcementsDeleted = count;
      },
    );
  }

  if (options.issueReports) {
    await runStep(
      result,
      'issue reports',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.ISSUE_REPORTS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.issueReportsDeleted = count;
      },
    );
  }

  if (options.helpTutorials) {
    await runStep(
      result,
      'help tutorials',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.HELP_TUTORIALS,
          range,
          onProgress,
        ),
      (count) => {
        result.helpTutorialsDeleted = count;
      },
    );
  }

  if (options.accountingPeriodLocks) {
    await runStep(
      result,
      'accounting period locks',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.ACCOUNTING_PERIOD_LOCKS,
          'start',
          'dateString',
          range,
          onProgress,
        ),
      (count) => {
        result.accountingPeriodLocksDeleted = count;
      },
    );
  }

  if (options.authSessions) {
    await runStep(
      result,
      'auth sessions',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.AUTH_SESSIONS,
          'updatedAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.authSessionsDeleted = count;
      },
    );
  }

  if (options.employeeCustomFieldValues) {
    await runStep(
      result,
      'employee custom field values',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES,
          range,
          onProgress,
        ),
      (count) => {
        result.employeeCustomFieldValuesDeleted = count;
      },
    );
  }

  if (options.employeeCustomFields) {
    await runStep(
      result,
      'employee custom fields',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS,
          range,
          onProgress,
        ),
      (count) => {
        result.employeeCustomFieldsDeleted = count;
      },
    );
  }

  if (options.courseEnrollments) {
    await runStep(
      result,
      'course enrollments',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.COURSE_ENROLLMENTS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.courseEnrollmentsDeleted = count;
      },
    );
  }

  if (options.courses) {
    await runStep(
      result,
      'courses',
      () =>
        deleteCollectionIgnoringDateFilter(COLLECTIONS.COURSES, range, onProgress),
      (count) => {
        result.coursesDeleted = count;
      },
    );
  }

  if (options.cargoInspections) {
    await runStep(
      result,
      'cargo inspections',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.CARGO_INSPECTIONS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.cargoInspectionsDeleted = count;
      },
    );
  }

  if (options.portalClients) {
    try {
      if (!options.cargoInspections) {
        await clearInspectionPortalAccess(onProgress);
      }
      result.portalClientsDeleted = await deleteCollectionIgnoringDateFilter(
        COLLECTIONS.PORTAL_CLIENTS,
        range,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete portal clients.',
      );
    }
  }

  if (options.kioskLoginLogs) {
    await runStep(
      result,
      'kiosk login logs',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.KIOSK_LOGIN_LOGS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.kioskLoginLogsDeleted = count;
      },
    );
  }

  if (options.kioskDevices) {
    await runStep(
      result,
      'kiosk devices',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.KIOSK_DEVICES,
          range,
          onProgress,
        ),
      (count) => {
        result.kioskDevicesDeleted = count;
      },
    );
  }

  if (options.clearEmployeeDocumentRefs || options.employeeDocumentsStorage) {
    if (hasDateRangeFilter(range) && !options.clearEmployeeDocumentRefs) {
      onProgress?.(
        'Skipped clearing employee document refs (date filter active — enable the checkbox to force).',
      );
    } else if (
      options.clearEmployeeDocumentRefs ||
      (options.employeeDocumentsStorage && !hasDateRangeFilter(range))
    ) {
      await runStep(
        result,
        'employee document refs',
        () => clearEmployeeDocumentRefs(onProgress),
        (count) => {
          result.employeeDocumentRefsCleared = count;
        },
      );
    }
  }

  if (options.locationGroups) {
    await runStep(
      result,
      'location groups',
      () =>
        deleteCollectionIgnoringDateFilter(
          COLLECTIONS.LOCATION_GROUPS,
          range,
          onProgress,
        ),
      (count) => {
        result.locationGroupsDeleted = count;
      },
    );
  }

  if (options.locations) {
    await runStep(
      result,
      'location photos',
      () => deleteStoragePrefix('location_photos', range, onProgress),
      (count) => {
        result.storageFilesDeleted += count;
      },
    );
    await runStep(
      result,
      'locations',
      () =>
        deleteCollectionIgnoringDateFilter(COLLECTIONS.LOCATIONS, range, onProgress),
      (count) => {
        result.locationsDeleted = count;
      },
    );
  }

  if (
    options.clearEmployeeLocationRefs ||
    ((options.locations || options.locationGroups) && !hasDateRangeFilter(range))
  ) {
    await runStep(
      result,
      'employee location refs',
      () => clearEmployeeLocationRefs(onProgress),
      (count) => {
        result.employeeLocationRefsCleared = count;
      },
    );
  }

  if (options.resetEmployeePresence) {
    if (hasDateRangeFilter(range) && options.attendanceRecords) {
      onProgress?.(
        'Skipped full presence reset (date filter active — presence is global).',
      );
    } else {
      await runStep(
        result,
        'employee presence reset',
        () => resetAllEmployeePresence(onProgress),
        (count) => {
          result.employeesReset = count;
        },
      );
    }
  }

  if (options.orphanedAuthUsers) {
    await runStep(
      result,
      'orphaned Auth users',
      () => deleteOrphanedAuthUsers(actorEmail, range, onProgress),
      (count) => {
        result.orphanedAuthUsersDeleted = count;
      },
    );
  }

  // Audit last so the purge action can still be recorded by the API afterward.
  if (options.auditLogs) {
    await runStep(
      result,
      'audit logs',
      () =>
        deleteCollectionDocumentsInRange(
          COLLECTIONS.AUDIT_LOGS,
          'createdAt',
          'timestamp',
          range,
          onProgress,
        ),
      (count) => {
        result.auditLogsDeleted = count;
      },
    );
  }

  if (result.errors.length > 0 && !purgeResultHasSuccess(result)) {
    throw new Error(result.errors.join(' '));
  }

  return result;
}
