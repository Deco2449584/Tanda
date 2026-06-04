import {
  collection,
  deleteField,
  getDocs,
  limit,
  query,
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
  shifts: boolean;
  leaveRequests: boolean;
  resetEmployeePresence: boolean;
}

export interface DataPurgeResult {
  attendanceRecordsDeleted: number;
  storageFilesDeleted: number;
  shiftsDeleted: number;
  leaveRequestsDeleted: number;
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
    shiftsDeleted: 0,
    leaveRequestsDeleted: 0,
    employeesReset: 0,
    errors: [],
  };

  const hasWork =
    options.attendanceRecords ||
    options.attendanceStorage ||
    options.shifts ||
    options.leaveRequests ||
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

  if (
    result.errors.length > 0 &&
    result.attendanceRecordsDeleted === 0 &&
    result.storageFilesDeleted === 0 &&
    result.shiftsDeleted === 0 &&
    result.leaveRequestsDeleted === 0 &&
    result.employeesReset === 0
  ) {
    throw new Error(result.errors.join(' '));
  }

  return result;
}
