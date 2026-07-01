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
import { mapPortalClientDoc } from '@/lib/portal/map-portal-client';
import {
  generatePortalPin,
  hashPortalPin,
  validatePortalPinFormat,
  verifyPortalPin,
} from '@/lib/portal/pin';
import type { PortalClient } from '@/lib/types/portal-client';

export async function fetchPortalClients(): Promise<PortalClient[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const snapshot = await getDocs(
    query(collection(db, COLLECTIONS.PORTAL_CLIENTS), orderBy('companyName')),
  );

  return snapshot.docs.map((document) =>
    mapPortalClientDoc(document.id, document.data()),
  );
}

async function assertPortalPinAvailable(
  pin: string,
  excludeClientId?: string,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');

  const trimmed = pin.trim();
  const snapshot = await getDocs(collection(db, COLLECTIONS.PORTAL_CLIENTS));

  for (const document of snapshot.docs) {
    if (excludeClientId && document.id === excludeClientId) continue;

    const data = document.data();
    if (typeof data.pin === 'string' && data.pin === trimmed) {
      throw new Error('This PIN is already in use by another client.');
    }

    if (typeof data.pinHash === 'string' && verifyPortalPin(trimmed, data.pinHash)) {
      throw new Error('This PIN is already in use by another client.');
    }
  }
}

async function generateUniquePortalPin(excludeClientId?: string): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generatePortalPin();
    try {
      await assertPortalPinAvailable(candidate, excludeClientId);
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

export async function createPortalClient(input: {
  companyName: string;
  accessCode: string;
  pin: string;
}): Promise<{ clientId: string; pin: string }> {
  if (!db) throw new Error('Firestore is not available.');

  const pinError = validatePortalPinFormat(input.pin);
  if (pinError) throw new Error(pinError);

  const companyName = input.companyName.trim();
  const accessCode = input.accessCode.trim().toUpperCase();

  if (!companyName || !accessCode) {
    throw new Error('Company name and access code are required.');
  }

  const pin = input.pin.trim();
  await assertPortalPinAvailable(pin);

  const docRef = await addDoc(collection(db, COLLECTIONS.PORTAL_CLIENTS), {
    companyName,
    accessCode,
    pinHash: hashPortalPin(pin),
    pin,
    active: true,
    createdAt: serverTimestamp(),
  });

  return { clientId: docRef.id, pin };
}

export async function regeneratePortalClientPin(
  clientId: string,
): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const pin = await generateUniquePortalPin(clientId);
  await updateDoc(doc(db, COLLECTIONS.PORTAL_CLIENTS, clientId), {
    pinHash: hashPortalPin(pin),
    pin,
  });

  return pin;
}

export async function setPortalClientActive(
  clientId: string,
  active: boolean,
): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  await updateDoc(doc(db, COLLECTIONS.PORTAL_CLIENTS, clientId), { active });
}

async function detachPortalClientFromInspections(
  clientId: string,
): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.CARGO_INSPECTIONS),
      where('portalClientId', '==', clientId),
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

/** Permanently deletes a portal client and disables portal access on linked inspections. */
export async function deletePortalClient(clientId: string): Promise<number> {
  if (!db) throw new Error('Firestore is not available.');

  const detachedCount = await detachPortalClientFromInspections(clientId);
  await deleteDoc(doc(db, COLLECTIONS.PORTAL_CLIENTS, clientId));

  return detachedCount;
}
