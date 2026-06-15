import { mapInspectionDoc } from '@/lib/inspections/map-inspection';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { mapPortalClientDoc } from '@/lib/portal/map-portal-client';
import { normalizeAwbNumber } from '@/lib/portal/normalize-awb';
import { verifyPortalPin } from '@/lib/portal/pin';
import type { CargoInspection } from '@/lib/types/cargo-inspection';
import type { PortalSessionPayload } from '@/lib/portal/session';

function extractStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('firebasestorage.googleapis.com')) {
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    if (parsed.hostname.endsWith('.firebasestorage.app')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const objectIndex = parts.indexOf('o');
      if (objectIndex >= 0 && parts[objectIndex + 1]) {
        return decodeURIComponent(parts[objectIndex + 1]);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function verifyPortalCredentials(
  awbNumber: string,
  pin: string,
): Promise<PortalSessionPayload | null> {
  const normalizedAwb = normalizeAwbNumber(awbNumber);
  if (!normalizedAwb || !pin.trim()) return null;

  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.CARGO_INSPECTIONS)
    .where('awbNumber', '==', normalizedAwb)
    .where('portalEnabled', '==', true)
    .get();

  if (snapshot.empty) return null;

  const clientIds = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const clientId = doc.data().portalClientId;
    if (typeof clientId === 'string' && clientId.trim()) {
      clientIds.add(clientId.trim());
    }
  });

  if (clientIds.size === 0) return null;

  for (const clientId of clientIds) {
    const clientDoc = await db
      .collection(COLLECTIONS.PORTAL_CLIENTS)
      .doc(clientId)
      .get();

    if (!clientDoc.exists) continue;

    const client = mapPortalClientDoc(clientId, clientDoc.data() ?? {});
    if (!client.active) continue;

    const pinHash = clientDoc.data()?.pinHash;
    if (typeof pinHash !== 'string') continue;

    if (verifyPortalPin(pin, pinHash)) {
      return { awbNumber: normalizedAwb, portalClientId: clientId };
    }
  }

  return null;
}

export async function fetchPortalInspections(
  session: PortalSessionPayload,
): Promise<CargoInspection[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.CARGO_INSPECTIONS)
    .where('awbNumber', '==', session.awbNumber)
    .where('portalEnabled', '==', true)
    .where('portalClientId', '==', session.portalClientId)
    .get();

  return snapshot.docs
    .map((doc) => mapInspectionDoc(doc.id, doc.data()))
    .sort(
      (a, b) =>
        new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
    );
}

export async function fetchPortalInspectionById(
  session: PortalSessionPayload,
  inspectionId: string,
): Promise<CargoInspection | null> {
  const db = getAdminFirestore();
  const doc = await db
    .collection(COLLECTIONS.CARGO_INSPECTIONS)
    .doc(inspectionId)
    .get();

  if (!doc.exists) return null;

  const inspection = mapInspectionDoc(doc.id, doc.data() ?? {});
  if (
    !inspection.portalEnabled ||
    inspection.portalClientId !== session.portalClientId ||
    normalizeAwbNumber(inspection.awbNumber) !== session.awbNumber
  ) {
    return null;
  }

  return inspection;
}

export async function signMediaUrls(
  urls: string[],
  expiresMinutes = 30,
): Promise<Record<string, string>> {
  const storage = getAdminStorage();
  const bucket = storage.bucket();
  const result: Record<string, string> = {};
  const expires = Date.now() + expiresMinutes * 60 * 1000;

  await Promise.all(
    urls.map(async (url) => {
      const path = extractStoragePathFromUrl(url);
      if (!path) {
        result[url] = url;
        return;
      }

      try {
        const [signed] = await bucket.file(path).getSignedUrl({
          action: 'read',
          expires,
        });
        result[url] = signed;
      } catch {
        result[url] = url;
      }
    }),
  );

  return result;
}

export async function enrichInspectionWithSignedMedia(
  inspection: CargoInspection,
): Promise<CargoInspection> {
  const allUrls = [...inspection.photoEvidence, ...inspection.videoEvidence];
  if (allUrls.length === 0) return inspection;

  const signed = await signMediaUrls(allUrls);

  return {
    ...inspection,
    photoEvidence: inspection.photoEvidence.map((url) => signed[url] ?? url),
    videoEvidence: inspection.videoEvidence.map((url) => signed[url] ?? url),
  };
}
