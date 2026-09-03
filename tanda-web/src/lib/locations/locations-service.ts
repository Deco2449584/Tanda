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
  writeBatch,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapLocationDoc } from '@/lib/locations/map-location';
import {
  generatePortalPin,
  hashPortalPin,
  validatePortalPinFormat,
  verifyPortalPin,
} from '@/lib/portal/pin';
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

async function assertLocationPinAvailable(
  pin: string,
  excludeLocationId?: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const trimmed = pin.trim();
  const snapshot = await getDocs(collection(db, COLLECTIONS.LOCATIONS));

  for (const document of snapshot.docs) {
    if (excludeLocationId && document.id === excludeLocationId) continue;

    const data = document.data();
    if (typeof data.pin === 'string' && data.pin === trimmed) {
      throw new Error('This PIN is already in use by another client.');
    }

    if (typeof data.pinHash === 'string' && verifyPortalPin(trimmed, data.pinHash)) {
      throw new Error('This PIN is already in use by another client.');
    }
  }
}

async function generateUniqueLocationPin(
  excludeLocationId?: string,
): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generatePortalPin();
    try {
      await assertLocationPinAvailable(candidate, excludeLocationId);
      return candidate;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'This PIN is already in use by another client.'
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Could not generate a unique PIN. Try again.');
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<{ locationId: string; pin: string }> {
  if (!db) throw new Error('Firestore is not available.');

  const name = input.name.trim();
  const city = input.city.trim();
  const code = input.code?.trim().toUpperCase();
  const pin = input.pin.trim();

  if (!name || !city) {
    throw new Error('Client name and city are required.');
  }

  const pinError = validatePortalPinFormat(pin);
  if (pinError) throw new Error(pinError);

  await assertLocationPinAvailable(pin);

  const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
    name,
    city,
    ...(code ? { code } : {}),
    pinHash: hashPortalPin(pin),
    pin,
    active: true,
    createdAt: serverTimestamp(),
  });

  return { locationId: docRef.id, pin };
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
    throw new Error('Client name and city are required.');
  }

  await updateDoc(doc(db, COLLECTIONS.LOCATIONS, locationId), {
    name,
    city,
    code: code ? code : deleteField(),
  });
}

export async function regenerateLocationPin(locationId: string): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const pin = await generateUniqueLocationPin(locationId);
  await updateDoc(doc(db, COLLECTIONS.LOCATIONS, locationId), {
    pinHash: hashPortalPin(pin),
    pin,
  });

  return pin;
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

async function detachLocationFromInspections(
  locationId: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.CARGO_INSPECTIONS),
      where('portalClientId', '==', locationId),
    ),
  );

  if (snapshot.empty) return 0;

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, {
      portalEnabled: false,
      portalClientId: deleteField(),
    });
  });
  await batch.commit();

  return snapshot.size;
}

/** Permanently deletes a client/location and disables portal access on linked inspections. */
export async function deleteLocation(locationId: string): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const assignedCount = await countEmployeesAtLocation(locationId);
  if (assignedCount > 0) {
    throw new Error(
      `Cannot delete this client. ${assignedCount} employee${assignedCount === 1 ? '' : 's'} still assigned. Reassign them first.`,
    );
  }

  const groupCount = await countLocationGroupsUsingLocation(locationId);
  if (groupCount > 0) {
    throw new Error(
      `Cannot delete this client. It is used by ${groupCount} location group${groupCount === 1 ? '' : 's'}.`,
    );
  }

  const detachedCount = await detachLocationFromInspections(locationId);
  await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, locationId));

  return detachedCount;
}
