import {
  collection,
  deleteField,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  deleteObject,
  listAll,
  ref,
  type StorageReference,
} from 'firebase/storage';
import { COLLECTIONS } from '@/lib/constants';
import { db, storage } from '@/lib/firebase';

const BATCH_SIZE = 400;

export interface DataPurgeOptions {
  attendanceRecords: boolean;
  attendanceStorage: boolean;
  attendanceJustifications: boolean;
  shifts: boolean;
  leaveRequests: boolean;
  notifications: boolean;
  notificationPreferences: boolean;
  announcements: boolean;
  cargoInspections: boolean;
  cargoInspectionsStorage: boolean;
  portalClients: boolean;
  locations: boolean;
  locationGroups: boolean;
  kioskDevices: boolean;
  employeeDocumentsStorage: boolean;
  auditLogs: boolean;
  resetEmployeePresence: boolean;
}

export interface DataPurgeResult {
  attendanceRecordsDeleted: number;
  storageFilesDeleted: number;
  attendanceJustificationsDeleted: number;
  shiftsDeleted: number;
  leaveRequestsDeleted: number;
  notificationsDeleted: number;
  notificationPreferencesDeleted: number;
  announcementsDeleted: number;
  cargoInspectionsDeleted: number;
  cargoInspectionsStorageDeleted: number;
  portalClientsDeleted: number;
  locationsDeleted: number;
  locationGroupsDeleted: number;
  kioskDevicesDeleted: number;
  employeeDocumentsStorageDeleted: number;
  auditLogsDeleted: number;
  employeesReset: number;
  errors: string[];
}

export type PurgeProgressCallback = (message: string) => void;

async function deleteCollectionDocuments(
  collectionName: string,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  if (!db) {
    throw new Error('Firebase is not available.');
  }

  let totalDeleted = 0;

  while (true) {
    const snapshot = await getDocs(
      query(collection(db, collectionName), limit(BATCH_SIZE)),
    );

    if (snapshot.empty) break;

    const batch = writeBatch(db);
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

async function deleteStorageTree(
  rootPath: string,
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  let deleted = 0;

  async function walk(folderRef: StorageReference): Promise<void> {
    const listing = await listAll(folderRef);

    await Promise.all(
      listing.items.map(async (itemRef) => {
        await deleteObject(itemRef);
        deleted += 1;
        if (deleted % 25 === 0) {
          onProgress?.(`Deleted ${deleted} file${deleted === 1 ? '' : 's'} from storage…`);
        }
      }),
    );

    for (const prefix of listing.prefixes) {
      await walk(prefix);
    }
  }

  onProgress?.(`Scanning storage folder "${rootPath}"…`);
  await walk(ref(storage, rootPath));
  onProgress?.(
    `Finished storage cleanup (${deleted} file${deleted === 1 ? '' : 's'}).`,
  );

  return deleted;
}

async function clearInspectionPortalAccess(
  onProgress?: PurgeProgressCallback,
): Promise<number> {
  if (!db) {
    throw new Error('Firebase is not available.');
  }

  let cleared = 0;

  while (true) {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.CARGO_INSPECTIONS),
        where('portalEnabled', '==', true),
        limit(BATCH_SIZE),
      ),
    );

    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        portalEnabled: false,
        portalClientId: deleteField(),
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
  if (!db) {
    throw new Error('Firebase is not available.');
  }

  let resetCount = 0;

  while (true) {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.EMPLOYEES), limit(BATCH_SIZE)),
    );

    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        lastAction: 'none',
        lastTimestampServer: deleteField(),
      });
    });
    await batch.commit();

    resetCount += snapshot.size;
    onProgress?.(`Reset presence for ${resetCount} employee${resetCount === 1 ? '' : 's'}…`);

    if (snapshot.size < BATCH_SIZE) break;
  }

  return resetCount;
}

export async function purgeOperationalData(
  options: DataPurgeOptions,
  onProgress?: PurgeProgressCallback,
): Promise<DataPurgeResult> {
  const result: DataPurgeResult = {
    attendanceRecordsDeleted: 0,
    storageFilesDeleted: 0,
    attendanceJustificationsDeleted: 0,
    shiftsDeleted: 0,
    leaveRequestsDeleted: 0,
    notificationsDeleted: 0,
    notificationPreferencesDeleted: 0,
    announcementsDeleted: 0,
    cargoInspectionsDeleted: 0,
    cargoInspectionsStorageDeleted: 0,
    portalClientsDeleted: 0,
    locationsDeleted: 0,
    locationGroupsDeleted: 0,
    kioskDevicesDeleted: 0,
    employeeDocumentsStorageDeleted: 0,
    auditLogsDeleted: 0,
    employeesReset: 0,
    errors: [],
  };

  const hasWork =
    options.attendanceRecords ||
    options.attendanceStorage ||
    options.attendanceJustifications ||
    options.shifts ||
    options.leaveRequests ||
    options.notifications ||
    options.notificationPreferences ||
    options.announcements ||
    options.cargoInspections ||
    options.cargoInspectionsStorage ||
    options.portalClients ||
    options.locations ||
    options.locationGroups ||
    options.kioskDevices ||
    options.employeeDocumentsStorage ||
    options.auditLogs ||
    options.resetEmployeePresence;

  if (!hasWork) {
    throw new Error('Select at least one item to delete.');
  }

  if (options.attendanceStorage) {
    try {
      result.storageFilesDeleted = await deleteStorageTree('attendance', onProgress);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete attendance photos.';
      result.errors.push(message);
    }
  }

  if (options.employeeDocumentsStorage) {
    try {
      result.employeeDocumentsStorageDeleted = await deleteStorageTree(
        'employee_documents',
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete employee identity documents.';
      result.errors.push(message);
    }
  }

  if (options.attendanceRecords) {
    try {
      result.attendanceRecordsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.ATTENDANCE_RECORDS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete attendance records.';
      result.errors.push(message);
    }
  }

  if (options.shifts) {
    try {
      result.shiftsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.SHIFTS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete shifts.';
      result.errors.push(message);
    }
  }

  if (options.leaveRequests) {
    try {
      result.leaveRequestsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LEAVE_REQUESTS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete leave requests.';
      result.errors.push(message);
    }
  }

  if (options.attendanceJustifications) {
    try {
      result.attendanceJustificationsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.ATTENDANCE_JUSTIFICATIONS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete attendance justifications.';
      result.errors.push(message);
    }
  }

  if (options.notifications) {
    try {
      result.notificationsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.NOTIFICATIONS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete notifications.';
      result.errors.push(message);
    }
  }

  if (options.notificationPreferences) {
    try {
      result.notificationPreferencesDeleted = await deleteCollectionDocuments(
        COLLECTIONS.NOTIFICATION_PREFERENCES,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete notification preferences.';
      result.errors.push(message);
    }
  }

  if (options.announcements) {
    try {
      result.announcementsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.ANNOUNCEMENTS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete announcements.';
      result.errors.push(message);
    }
  }

  if (options.cargoInspectionsStorage) {
    try {
      result.cargoInspectionsStorageDeleted = await deleteStorageTree(
        'cargo_inspections',
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete cargo inspection media.';
      result.errors.push(message);
    }
  }

  if (options.cargoInspections) {
    try {
      result.cargoInspectionsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.CARGO_INSPECTIONS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete cargo inspections.';
      result.errors.push(message);
    }
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
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete portal clients.';
      result.errors.push(message);
    }
  }

  if (options.auditLogs) {
    try {
      result.auditLogsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.AUDIT_LOGS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete audit logs.';
      result.errors.push(message);
    }
  }

  if (options.resetEmployeePresence) {
    try {
      result.employeesReset = await resetAllEmployeePresence(onProgress);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not reset employee presence status.';
      result.errors.push(message);
    }
  }

  if (options.kioskDevices) {
    try {
      result.kioskDevicesDeleted = await deleteCollectionDocuments(
        COLLECTIONS.KIOSK_DEVICES,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete kiosk devices.';
      result.errors.push(message);
    }
  }

  if (options.locationGroups) {
    try {
      result.locationGroupsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LOCATION_GROUPS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not delete location groups.';
      result.errors.push(message);
    }
  }

  if (options.locations) {
    try {
      result.locationsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LOCATIONS,
        onProgress,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete locations.';
      result.errors.push(message);
    }
  }

  if (
    result.errors.length > 0 &&
    result.attendanceRecordsDeleted === 0 &&
    result.storageFilesDeleted === 0 &&
    result.attendanceJustificationsDeleted === 0 &&
    result.shiftsDeleted === 0 &&
    result.leaveRequestsDeleted === 0 &&
    result.notificationsDeleted === 0 &&
    result.notificationPreferencesDeleted === 0 &&
    result.announcementsDeleted === 0 &&
    result.cargoInspectionsDeleted === 0 &&
    result.cargoInspectionsStorageDeleted === 0 &&
    result.portalClientsDeleted === 0 &&
    result.locationsDeleted === 0 &&
    result.locationGroupsDeleted === 0 &&
    result.kioskDevicesDeleted === 0 &&
    result.employeeDocumentsStorageDeleted === 0 &&
    result.auditLogsDeleted === 0 &&
    result.employeesReset === 0
  ) {
    throw new Error(result.errors.join(' '));
  }

  return result;
}
