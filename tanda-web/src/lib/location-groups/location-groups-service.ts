import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapLocationGroupDoc } from '@/lib/location-groups/map-location-group';
import type {
  CreateLocationGroupInput,
  LocationGroup,
  UpdateLocationGroupInput,
} from '@/lib/types/location-group';

export function subscribeLocationGroups(
  onData: (groups: LocationGroup[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error('Firestore is not available.'));
    return () => {};
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.LOCATION_GROUPS), orderBy('name')),
    (snapshot) => {
      onData(
        snapshot.docs.map((document) =>
          mapLocationGroupDoc(document.id, document.data()),
        ),
      );
    },
    (error) => onError?.(error),
  );
}

export async function createLocationGroup(
  input: CreateLocationGroupInput,
): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  const locationIds = input.locationIds.map((id) => id.trim()).filter(Boolean);

  if (!name) throw new Error('Group name is required.');
  if (locationIds.length === 0) {
    throw new Error('Select at least one location for this group.');
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.LOCATION_GROUPS), {
    name,
    locationIds,
    active: true,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateLocationGroup(
  groupId: string,
  input: UpdateLocationGroupInput,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  const locationIds = input.locationIds.map((id) => id.trim()).filter(Boolean);

  if (!name) throw new Error('Group name is required.');
  if (locationIds.length === 0) {
    throw new Error('Select at least one location for this group.');
  }

  await updateDoc(doc(db, COLLECTIONS.LOCATION_GROUPS, groupId), {
    name,
    locationIds,
  });
}

export async function setLocationGroupActive(
  groupId: string,
  active: boolean,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  await updateDoc(doc(db, COLLECTIONS.LOCATION_GROUPS, groupId), { active });
}

export async function countEmployeesInLocationGroup(
  groupId: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('locationGroupId', '==', groupId),
    ),
  );

  return snapshot.size;
}

export async function deleteLocationGroup(groupId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const assignedCount = await countEmployeesInLocationGroup(groupId);
  if (assignedCount > 0) {
    throw new Error(
      `Cannot delete this group. ${assignedCount} employee${assignedCount === 1 ? '' : 's'} still assigned.`,
    );
  }

  await deleteDoc(doc(db, COLLECTIONS.LOCATION_GROUPS, groupId));
}

export async function migrateEmployeesToLocationGroups(): Promise<{
  groupsCreated: number;
  employeesUpdated: number;
}> {
  if (!db) throw new Error('Firestore is not available.');

  const employeesSnapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
  let groupsCreated = 0;
  let employeesUpdated = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const employeeDoc of employeesSnapshot.docs) {
    const data = employeeDoc.data();
    if (typeof data.locationGroupId === 'string' && data.locationGroupId.trim()) {
      continue;
    }

    const locationId =
      typeof data.locationId === 'string' ? data.locationId.trim() : '';
    if (!locationId) continue;

    const employeeName =
      typeof data.name === 'string' && data.name.trim()
        ? data.name.trim()
        : 'Employee';

    const groupRef = await addDoc(collection(db, COLLECTIONS.LOCATION_GROUPS), {
      name: `Legacy - ${employeeName}`,
      locationIds: [locationId],
      active: true,
      createdAt: serverTimestamp(),
    });
    groupsCreated += 1;

    batch.update(employeeDoc.ref, { locationGroupId: groupRef.id });
    employeesUpdated += 1;
    batchCount += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return { groupsCreated, employeesUpdated };
}
