import {
  addDoc,
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
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

export async function deletePortalClient(clientId: string): Promise<void> {
  if (!db) throw new Error('Firestore is not available.');
  await updateDoc(doc(db, COLLECTIONS.PORTAL_CLIENTS, clientId), {
    active: false,
  });
}
