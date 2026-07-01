import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapLocationDoc } from '@/lib/locations/map-location';
import type {
  CreateLocationInput,
  Location,
  UpdateLocationInput,
} from '@/lib/types/location';

export async function fetchLocations(): Promise<Location[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.LOCATIONS), orderBy('name')),
  );

  return snapshot.docs.map((document) =>
    mapLocationDoc(document.id, document.data()),
  );
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  const city = input.city.trim();
  const code = input.code?.trim().toUpperCase();

  if (!name || !city) {
    throw new Error('Location name and city are required.');
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
    name,
    city,
    ...(code ? { code } : {}),
    active: true,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateLocation(
  locationId: string,
  input: UpdateLocationInput,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  const city = input.city.trim();
  const code = input.code?.trim().toUpperCase();

  if (!name || !city) {
    throw new Error('Location name and city are required.');
  }

  await updateDoc(doc(db, COLLECTIONS.LOCATIONS, locationId), {
    name,
    city,
    code: code ? code : deleteField(),
  });
}

export async function setLocationActive(
  locationId: string,
  active: boolean,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  await updateDoc(doc(db, COLLECTIONS.LOCATIONS, locationId), { active });
}

export async function countEmployeesAtLocation(
  locationId: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('locationId', '==', locationId),
    ),
  );

  return snapshot.size;
}

export async function countLocationGroupsUsingLocation(
  locationId: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(collection(db, COLLECTIONS.LOCATION_GROUPS));
  return snapshot.docs.filter((document) => {
    const locationIds = document.data().locationIds;
    return Array.isArray(locationIds) && locationIds.includes(locationId);
  }).length;
}

export async function deleteLocation(locationId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const assignedCount = await countEmployeesAtLocation(locationId);
  if (assignedCount > 0) {
    throw new Error(
      `Cannot delete this location. ${assignedCount} employee${assignedCount === 1 ? '' : 's'} still assigned. Reassign them first.`,
    );
  }

  const groupCount = await countLocationGroupsUsingLocation(locationId);
  if (groupCount > 0) {
    throw new Error(
      `Cannot delete this location. It is used by ${groupCount} location group${groupCount === 1 ? '' : 's'}.`,
    );
  }

  await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, locationId));
}
