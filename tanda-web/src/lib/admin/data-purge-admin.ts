import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import type {
  DataPurgeOptions,
  DataPurgeResult,
  PurgeProgressCallback,
} from '@/lib/admin/data-purge';

const BATCH_SIZE = 400;

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

  while (true) {
    const snapshot = await db.collection(COLLECTIONS.EMPLOYEES).limit(BATCH_SIZE).get();
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
    onProgress?.(`Reset presence for ${resetCount} employee${resetCount === 1 ? '' : 's'}…`);

    if (snapshot.size < BATCH_SIZE) break;
  }

  return resetCount;
}

export async function purgeOperationalDataAdmin(
  options: DataPurgeOptions,
  onProgress?: PurgeProgressCallback,
): Promise<DataPurgeResult> {
  const result: DataPurgeResult = {
    attendanceRecordsDeleted: 0,
    storageFilesDeleted: 0,
    shiftsDeleted: 0,
    leaveRequestsDeleted: 0,
    cargoInspectionsDeleted: 0,
    cargoInspectionsStorageDeleted: 0,
    portalClientsDeleted: 0,
    locationsDeleted: 0,
    locationGroupsDeleted: 0,
    kioskDevicesDeleted: 0,
    employeesReset: 0,
    errors: [],
  };

  const hasWork =
    options.attendanceRecords ||
    options.attendanceStorage ||
    options.shifts ||
    options.leaveRequests ||
    options.cargoInspections ||
    options.cargoInspectionsStorage ||
    options.portalClients ||
    options.locations ||
    options.locationGroups ||
    options.kioskDevices ||
    options.resetEmployeePresence;

  if (!hasWork) {
    throw new Error('Select at least one item to delete.');
  }

  if (options.attendanceStorage) {
    try {
      result.storageFilesDeleted += await deleteStoragePrefix('attendance', onProgress);
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete attendance photos.',
      );
    }
  }

  if (options.attendanceRecords) {
    try {
      result.attendanceRecordsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.ATTENDANCE_RECORDS,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete attendance records.',
      );
    }
  }

  if (options.shifts) {
    try {
      result.shiftsDeleted = await deleteCollectionDocuments(COLLECTIONS.SHIFTS, onProgress);
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete shifts.',
      );
    }
  }

  if (options.leaveRequests) {
    try {
      result.leaveRequestsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LEAVE_REQUESTS,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete leave requests.',
      );
    }
  }

  if (options.cargoInspectionsStorage) {
    try {
      result.cargoInspectionsStorageDeleted = await deleteStoragePrefix(
        'cargo_inspections',
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? error.message
          : 'Could not delete cargo inspection media.',
      );
    }
  }

  if (options.cargoInspections) {
    try {
      result.cargoInspectionsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.CARGO_INSPECTIONS,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete cargo inspections.',
      );
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
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete portal clients.',
      );
    }
  }

  if (options.resetEmployeePresence) {
    try {
      result.employeesReset = await resetAllEmployeePresence(onProgress);
    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? error.message
          : 'Could not reset employee presence status.',
      );
    }
  }

  if (options.kioskDevices) {
    try {
      result.kioskDevicesDeleted = await deleteCollectionDocuments(
        COLLECTIONS.KIOSK_DEVICES,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete kiosk devices.',
      );
    }
  }

  if (options.locationGroups) {
    try {
      result.locationGroupsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LOCATION_GROUPS,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete location groups.',
      );
    }
  }

  if (options.locations) {
    try {
      result.locationsDeleted = await deleteCollectionDocuments(
        COLLECTIONS.LOCATIONS,
        onProgress,
      );
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : 'Could not delete locations.',
      );
    }
  }

  const anySuccess =
    result.attendanceRecordsDeleted > 0 ||
    result.storageFilesDeleted > 0 ||
    result.shiftsDeleted > 0 ||
    result.leaveRequestsDeleted > 0 ||
    result.cargoInspectionsDeleted > 0 ||
    result.cargoInspectionsStorageDeleted > 0 ||
    result.portalClientsDeleted > 0 ||
    result.locationsDeleted > 0 ||
    result.locationGroupsDeleted > 0 ||
    result.kioskDevicesDeleted > 0 ||
    result.employeesReset > 0;

  if (result.errors.length > 0 && !anySuccess) {
    throw new Error(result.errors.join(' '));
  }

  return result;
}
