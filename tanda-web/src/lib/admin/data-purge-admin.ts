import { FieldValue, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import {
  createEmptyPurgeResult,
  purgeOptionsHasWork,
  purgeResultHasSuccess,
  type DataPurgeOptions,
  type DataPurgeResult,
  type PurgeProgressCallback,
} from '@/lib/admin/data-purge';

const BATCH_SIZE = 400;

async function deleteCollectionDocuments(
  collectionName: string,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminDb();
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

async function deleteStoragePrefix(
  rootPath: string,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const prefix = rootPath.endsWith('/') ? rootPath : `${rootPath}/`;
  const [files] = await bucket.getFiles({ prefix });

  onProgress?.(`Scanning storage folder "${rootPath}"…`);

  let deleted = 0;
  for (const file of files) {
    await file.delete();
    deleted += 1;
    if (deleted % 25 === 0) {
      onProgress?.(`Deleted ${deleted} file${deleted === 1 ? '' : 's'} from storage…`);
    }
  }

  onProgress?.(
    `Finished storage cleanup (${deleted} file${deleted === 1 ? '' : 's'}).`,
  );

  return deleted;
}

async function clearInspectionPortalAccess(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  const db = getAdminDb();
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
  const db = getAdminDb();
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
  const db = getAdminDb();
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
  const db = getAdminDb();
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
): Promise<DataPurgeResult> {
  const result = createEmptyPurgeResult();

  if (!purgeOptionsHasWork(options)) {
    throw new Error('Select at least one item to delete.');
  }

  // Storage first where media pairs with Firestore docs.
  if (options.attendanceStorage) {
    await runStep(
      result,
      'attendance photos',
      () => deleteStoragePrefix('attendance', onProgress),
      (count) => {
        result.storageFilesDeleted += count;
      },
    );
  }

  if (options.employeeDocumentsStorage) {
    await runStep(
      result,
      'employee documents',
      () => deleteStoragePrefix('employee_documents', onProgress),
      (count) => {
        result.employeeDocumentsStorageDeleted = count;
      },
    );
  }

  if (options.issueReportsStorage) {
    await runStep(
      result,
      'issue report attachments',
      () => deleteStoragePrefix('issue_reports', onProgress),
      (count) => {
        result.issueReportsStorageDeleted = count;
      },
    );
  }

  if (options.helpTutorialsStorage) {
    await runStep(
      result,
      'help tutorial media',
      () => deleteStoragePrefix('help_tutorials', onProgress),
      (count) => {
        result.helpTutorialsStorageDeleted = count;
      },
    );
  }

  if (options.cargoInspectionsStorage) {
    await runStep(
      result,
      'cargo inspection media',
      () => deleteStoragePrefix('cargo_inspections', onProgress),
      (count) => {
        result.cargoInspectionsStorageDeleted = count;
      },
    );
  }

  // Operational Firestore collections.
  if (options.attendanceRecords) {
    await runStep(
      result,
      'attendance records',
      () => deleteCollectionDocuments(COLLECTIONS.ATTENDANCE_RECORDS, onProgress),
      (count) => {
        result.attendanceRecordsDeleted = count;
      },
    );
  }

  if (options.shifts) {
    await runStep(
      result,
      'shifts',
      () => deleteCollectionDocuments(COLLECTIONS.SHIFTS, onProgress),
      (count) => {
        result.shiftsDeleted = count;
      },
    );
  }

  if (options.leaveRequests) {
    await runStep(
      result,
      'leave requests',
      () => deleteCollectionDocuments(COLLECTIONS.LEAVE_REQUESTS, onProgress),
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
        deleteCollectionDocuments(COLLECTIONS.ATTENDANCE_JUSTIFICATIONS, onProgress),
      (count) => {
        result.attendanceJustificationsDeleted = count;
      },
    );
  }

  if (options.notifications) {
    await runStep(
      result,
      'notifications',
      () => deleteCollectionDocuments(COLLECTIONS.NOTIFICATIONS, onProgress),
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
        deleteCollectionDocuments(COLLECTIONS.NOTIFICATION_PREFERENCES, onProgress),
      (count) => {
        result.notificationPreferencesDeleted = count;
      },
    );
  }

  if (options.announcements) {
    await runStep(
      result,
      'announcements',
      () => deleteCollectionDocuments(COLLECTIONS.ANNOUNCEMENTS, onProgress),
      (count) => {
        result.announcementsDeleted = count;
      },
    );
  }

  if (options.issueReports) {
    await runStep(
      result,
      'issue reports',
      () => deleteCollectionDocuments(COLLECTIONS.ISSUE_REPORTS, onProgress),
      (count) => {
        result.issueReportsDeleted = count;
      },
    );
  }

  if (options.helpTutorials) {
    await runStep(
      result,
      'help tutorials',
      () => deleteCollectionDocuments(COLLECTIONS.HELP_TUTORIALS, onProgress),
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
        deleteCollectionDocuments(COLLECTIONS.ACCOUNTING_PERIOD_LOCKS, onProgress),
      (count) => {
        result.accountingPeriodLocksDeleted = count;
      },
    );
  }

  if (options.authSessions) {
    await runStep(
      result,
      'auth sessions',
      () => deleteCollectionDocuments(COLLECTIONS.AUTH_SESSIONS, onProgress),
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
        deleteCollectionDocuments(
          COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES,
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
        deleteCollectionDocuments(COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS, onProgress),
      (count) => {
        result.employeeCustomFieldsDeleted = count;
      },
    );
  }

  if (options.cargoInspections) {
    await runStep(
      result,
      'cargo inspections',
      () => deleteCollectionDocuments(COLLECTIONS.CARGO_INSPECTIONS, onProgress),
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
      result.portalClientsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.PORTAL_CLIENTS,
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
      () => deleteCollectionDocuments(COLLECTIONS.KIOSK_LOGIN_LOGS, onProgress),
      (count) => {
        result.kioskLoginLogsDeleted = count;
      },
    );
  }

  if (options.kioskDevices) {
    await runStep(
      result,
      'kiosk devices',
      () => deleteCollectionDocuments(COLLECTIONS.KIOSK_DEVICES, onProgress),
      (count) => {
        result.kioskDevicesDeleted = count;
      },
    );
  }

  if (options.clearEmployeeDocumentRefs || options.employeeDocumentsStorage) {
    await runStep(
      result,
      'employee document refs',
      () => clearEmployeeDocumentRefs(onProgress),
      (count) => {
        result.employeeDocumentRefsCleared = count;
      },
    );
  }

  if (options.locationGroups) {
    await runStep(
      result,
      'location groups',
      () => deleteCollectionDocuments(COLLECTIONS.LOCATION_GROUPS, onProgress),
      (count) => {
        result.locationGroupsDeleted = count;
      },
    );
  }

  if (options.locations) {
    await runStep(
      result,
      'locations',
      () => deleteCollectionDocuments(COLLECTIONS.LOCATIONS, onProgress),
      (count) => {
        result.locationsDeleted = count;
      },
    );
  }

  if (
    options.clearEmployeeLocationRefs ||
    options.locations ||
    options.locationGroups
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
    await runStep(
      result,
      'employee presence reset',
      () => resetAllEmployeePresence(onProgress),
      (count) => {
        result.employeesReset = count;
      },
    );
  }

  // Audit last so the purge action can still be recorded by the API afterward.
  if (options.auditLogs) {
    await runStep(
      result,
      'audit logs',
      () => deleteCollectionDocuments(COLLECTIONS.AUDIT_LOGS, onProgress),
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
