import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import type {
  CascadeImpactItem,
  LocationCascadePreview,
} from '@/lib/types/cascade-delete';

export type { LocationCascadePreview };

const BATCH_SIZE = 400;

async function countByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  const snapshot = await getAdminFirestore()
    .collection(collectionName)
    .where(field, '==', value)
    .count()
    .get();
  return snapshot.data().count;
}

async function deleteByField(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  const db = getAdminFirestore();
  let deleted = 0;

  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where(field, '==', value)
      .limit(BATCH_SIZE)
      .get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
  }

  return deleted;
}

async function clearEmployeesAtLocation(locationId: string): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;

  while (true) {
    const snapshot = await db
      .collection(COLLECTIONS.EMPLOYEES)
      .where('locationId', '==', locationId)
      .limit(BATCH_SIZE)
      .get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((document) => {
      batch.update(document.ref, {
        locationId: FieldValue.delete(),
      });
    });
    await batch.commit();
    cleared += snapshot.size;
    if (snapshot.size < BATCH_SIZE) break;
  }

  return cleared;
}

async function removeLocationFromGroups(locationId: string): Promise<number> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTIONS.LOCATION_GROUPS).get();
  let updated = 0;
  const batch = db.batch();

  snapshot.docs.forEach((document) => {
    const locationIds = document.data().locationIds;
    if (!Array.isArray(locationIds) || !locationIds.includes(locationId)) return;
    batch.update(document.ref, {
      locationIds: locationIds.filter((id: unknown) => id !== locationId),
    });
    updated += 1;
  });

  if (updated > 0) await batch.commit();
  return updated;
}

async function detachPortal(locationId: string): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;

  while (true) {
    const snapshot = await db
      .collection(COLLECTIONS.CARGO_INSPECTIONS)
      .where('portalClientId', '==', locationId)
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
    if (snapshot.size < BATCH_SIZE) break;
  }

  return cleared;
}

async function clearAudienceRefs(locationId: string): Promise<number> {
  const db = getAdminFirestore();
  let cleared = 0;

  for (const collectionName of [
    COLLECTIONS.ANNOUNCEMENTS,
    COLLECTIONS.HELP_TUTORIALS,
  ] as const) {
    while (true) {
      const snapshot = await db
        .collection(collectionName)
        .where('audience', '==', 'location')
        .where('audienceValue', '==', locationId)
        .limit(BATCH_SIZE)
        .get();
      if (snapshot.empty) break;

      const batch = db.batch();
      snapshot.docs.forEach((document) => {
        batch.update(document.ref, {
          audienceValue: FieldValue.delete(),
        });
      });
      await batch.commit();
      cleared += snapshot.size;
      if (snapshot.size < BATCH_SIZE) break;
    }
  }

  return cleared;
}

async function deleteLocationPhoto(locationId: string): Promise<number> {
  const safe = locationId.trim().replace(/[^\w-]/g, '_');
  const bucket = getAdminStorage().bucket();
  try {
    await bucket.file(`location_photos/${safe}.webp`).delete({ ignoreNotFound: true });
    return 1;
  } catch {
    return 0;
  }
}

export async function previewLocationCascadeDelete(
  locationId: string,
): Promise<LocationCascadePreview> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.LOCATIONS)
    .doc(locationId)
    .get();

  if (!snapshot.exists) {
    throw new Error('Client not found.');
  }

  const data = snapshot.data() ?? {};
  const name = typeof data.name === 'string' ? data.name : 'Client';

  const [
    employees,
    shifts,
    attendance,
    inspectionsClient,
    portalLinked,
    kioskLogs,
  ] = await Promise.all([
    countByField(COLLECTIONS.EMPLOYEES, 'locationId', locationId),
    countByField(COLLECTIONS.SHIFTS, 'locationId', locationId),
    countByField(COLLECTIONS.ATTENDANCE_RECORDS, 'locationId', locationId),
    countByField(COLLECTIONS.CARGO_INSPECTIONS, 'clientLocationId', locationId),
    countByField(COLLECTIONS.CARGO_INSPECTIONS, 'portalClientId', locationId),
    countByField(COLLECTIONS.KIOSK_LOGIN_LOGS, 'locationId', locationId),
  ]);

  const groupsSnapshot = await getAdminFirestore()
    .collection(COLLECTIONS.LOCATION_GROUPS)
    .get();
  const groupsUsing = groupsSnapshot.docs.filter((document) => {
    const locationIds = document.data().locationIds;
    return Array.isArray(locationIds) && locationIds.includes(locationId);
  }).length;

  const items: CascadeImpactItem[] = [
    { key: 'client', label: 'Client / location record', count: 1, action: 'delete' },
    {
      key: 'employees',
      label: 'Staff assignments (will be cleared — staff kept)',
      count: employees,
      action: 'clear',
    },
    {
      key: 'groups',
      label: 'Location groups (client removed from group)',
      count: groupsUsing,
      action: 'clear',
    },
    { key: 'shifts', label: 'Shifts at this site', count: shifts, action: 'delete' },
    {
      key: 'attendance',
      label: 'Attendance punches at this site',
      count: attendance,
      action: 'delete',
    },
    {
      key: 'portal',
      label: 'Inspections with portal linked to this client',
      count: portalLinked,
      action: 'clear',
    },
    {
      key: 'inspections',
      label: 'Inspections tagged with this client (client link cleared, records kept)',
      count: inspectionsClient,
      action: 'clear',
    },
    {
      key: 'kioskLogs',
      label: 'Kiosk login logs at this site',
      count: kioskLogs,
      action: 'delete',
    },
  ];

  return {
    locationId,
    name,
    items: items.filter((item) => item.count > 0 || item.key === 'client'),
    blocked: false,
  };
}

export async function executeLocationCascadeDelete(
  locationId: string,
): Promise<LocationCascadePreview> {
  const preview = await previewLocationCascadeDelete(locationId);

  await deleteLocationPhoto(locationId);
  await clearEmployeesAtLocation(locationId);
  await removeLocationFromGroups(locationId);
  await detachPortal(locationId);

  // Clear clientLocationId on inspections (keep cargo records)
  {
    const db = getAdminFirestore();
    while (true) {
      const snapshot = await db
        .collection(COLLECTIONS.CARGO_INSPECTIONS)
        .where('clientLocationId', '==', locationId)
        .limit(BATCH_SIZE)
        .get();
      if (snapshot.empty) break;
      const batch = db.batch();
      snapshot.docs.forEach((document) => {
        batch.update(document.ref, {
          clientLocationId: FieldValue.delete(),
          clientLocationName: FieldValue.delete(),
        });
      });
      await batch.commit();
      if (snapshot.size < BATCH_SIZE) break;
    }
  }

  await clearAudienceRefs(locationId);
  await deleteByField(COLLECTIONS.SHIFTS, 'locationId', locationId);
  await deleteByField(COLLECTIONS.ATTENDANCE_RECORDS, 'locationId', locationId);
  await deleteByField(COLLECTIONS.KIOSK_LOGIN_LOGS, 'locationId', locationId);
  await getAdminFirestore().collection(COLLECTIONS.LOCATIONS).doc(locationId).delete();

  return preview;
}
