import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
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
import { mapPortalClientDoc } from '@/lib/portal/map-portal-client';
import {
  generatePortalPin,
  hashPortalPin,
  validatePortalPinFormat,
} from '@/lib/portal/pin';
import type { PortalClient } from '@/lib/types/portal-client';

export function subscribePortalClients(
  onData: (clients: PortalClient[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (!db) {
    onError?.(new Error('Firestore is not available.'));
    return () => {};
  }

  return onSnapshot(
    query(collection(db, COLLECTIONS.PORTAL_CLIENTS), orderBy('companyName')),
    (snapshot) => {
      onData(
        snapshot.docs.map((document) =>
          mapPortalClientDoc(document.id, document.data()),
        ),
      );
    },
    (error) => onError?.(error),
  );
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
  const docRef = await addDoc(collection(db, COLLECTIONS.PORTAL_CLIENTS), {
    companyName,
    accessCode,
    pinHash: hashPortalPin(pin),
    active: true,
    createdAt: serverTimestamp(),
  });

  return { clientId: docRef.id, pin };
}

export async function regeneratePortalClientPin(
  clientId: string,
): Promise<string> {
  if (!db) throw new Error('Firestore is not available.');

  const pin = generatePortalPin();
  await updateDoc(doc(db, COLLECTIONS.PORTAL_CLIENTS, clientId), {
    pinHash: hashPortalPin(pin),
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
