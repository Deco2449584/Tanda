import { doc, getDoc, getDocs, collection } from 'firebase/firestore';

import { db } from '@/services/firebaseConfig';

const LOCATIONS_COLLECTION = 'locations';
const LOCATION_GROUPS_COLLECTION = 'location_groups';

export type InspectClientLocation = {
  id: string;
  name: string;
  active: boolean;
};

function mapLocation(
  id: string,
  data: Record<string, unknown>,
): InspectClientLocation | null {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) return null;
  return {
    id,
    name,
    active: data.active !== false,
  };
}

/**
 * Resolves client/sites the employee may register cargo against:
 * primary `locationId` + all locations in `locationGroupId`.
 */
export async function fetchAllowedClientLocations(input: {
  locationId?: string;
  locationGroupId?: string;
}): Promise<InspectClientLocation[]> {
  if (!db) return [];

  const ids = new Set<string>();
  if (input.locationId?.trim()) {
    ids.add(input.locationId.trim());
  }

  const groupId = input.locationGroupId?.trim();
  if (groupId) {
    const groupSnap = await getDoc(doc(db, LOCATION_GROUPS_COLLECTION, groupId));
    if (groupSnap.exists()) {
      const data = groupSnap.data() as Record<string, unknown>;
      const locationIds = Array.isArray(data.locationIds) ? data.locationIds : [];
      for (const rawId of locationIds) {
        if (typeof rawId === 'string' && rawId.trim()) {
          ids.add(rawId.trim());
        }
      }
    }
  }

  if (ids.size === 0) {
    return [];
  }

  // Prefer batched reads for known ids; fall back to full scan only if needed.
  const results: InspectClientLocation[] = [];
  await Promise.all(
    [...ids].map(async (id) => {
      const snap = await getDoc(doc(db, LOCATIONS_COLLECTION, id));
      if (!snap.exists()) return;
      const mapped = mapLocation(snap.id, snap.data() as Record<string, unknown>);
      if (mapped?.active) {
        results.push(mapped);
      }
    }),
  );

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin fallback: all active locations (not used for operators). */
export async function fetchAllActiveClientLocations(): Promise<InspectClientLocation[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, LOCATIONS_COLLECTION));
  return snapshot.docs
    .map((document) =>
      mapLocation(document.id, document.data() as Record<string, unknown>),
    )
    .filter((item): item is InspectClientLocation => Boolean(item?.active))
    .sort((a, b) => a.name.localeCompare(b.name));
}
