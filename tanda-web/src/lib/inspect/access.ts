import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { isMasterRole, type UserRole } from '@/lib/auth/roles';
import { mapLocationDoc } from '@/lib/locations/map-location';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

export interface InspectAccess {
  canUseInspect: boolean;
  isInspectAdmin: boolean;
}

/**
 * Mirrors the mobile app gate: the employee record must be active and have
 * Continental Inspect enabled. Master always gets admin powers.
 */
export function resolveInspectAccess(
  employee: Employee | null,
  role: UserRole | null,
): InspectAccess {
  if (!employee || employee.active !== true) {
    return { canUseInspect: false, isInspectAdmin: false };
  }

  const isMaster = role ? isMasterRole(role) : false;
  const enabled = employee.continentalInspectEnabled === true || isMaster;

  return {
    canUseInspect: enabled,
    isInspectAdmin: enabled && (isMaster || employee.continentalInspectAdmin === true),
  };
}

/**
 * Clients an operator may register cargo against: their own site plus every
 * site in their assigned location group. Inspect admins get all active clients.
 */
export async function fetchAllowedInspectClients(
  employee: Employee | null,
  isInspectAdmin: boolean,
): Promise<Location[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  if (isInspectAdmin) {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.LOCATIONS), where('active', '==', true)),
    );
    return snapshot.docs
      .map((document) => mapLocationDoc(document.id, document.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (!employee) {
    return [];
  }

  const allowedIds = new Set<string>();
  if (employee.locationId) {
    allowedIds.add(employee.locationId);
  }

  if (employee.locationGroupId) {
    const groupSnapshot = await getDoc(
      doc(db, COLLECTIONS.LOCATION_GROUPS, employee.locationGroupId),
    );
    const groupIds = groupSnapshot.data()?.locationIds;
    if (Array.isArray(groupIds)) {
      groupIds
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .forEach((id) => allowedIds.add(id));
    }
  }

  if (allowedIds.size === 0) {
    return [];
  }

  const documents = await Promise.all(
    [...allowedIds].map((id) => getDoc(doc(db!, COLLECTIONS.LOCATIONS, id))),
  );

  return documents
    .filter((document) => document.exists())
    .map((document) => mapLocationDoc(document.id, document.data() ?? {}))
    .filter((location) => location.active)
    .sort((a, b) => a.name.localeCompare(b.name));
}
