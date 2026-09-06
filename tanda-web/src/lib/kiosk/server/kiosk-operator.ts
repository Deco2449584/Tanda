import { COLLECTIONS } from '@/lib/constants';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { mapLocationDoc } from '@/lib/locations/map-location';
import { getAllowedLocationsForEmployee } from '@/lib/location-groups/can-punch-at-location';
import { mapLocationGroupDoc } from '@/lib/location-groups/map-location-group';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';
import type { KioskContext, KioskLocationOption } from '@/lib/types/kiosk-context';
import type { UserRole } from '@/lib/auth/roles';

export class KioskAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface KioskOperator {
  uid: string;
  email: string;
  employeeDocId: string;
  employeeId: string;
  name: string;
  role: UserRole;
  isKioskAccount: boolean;
  locationId: string;
  locationGroupId: string;
  kioskEnabled: boolean;
}

export async function requireKioskOperator(request: Request): Promise<KioskOperator> {
  const user = await verifyFirebaseToken(request.headers.get('authorization'));
  if (!user) {
    throw new KioskAccessError('Unauthorized.', 401);
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('email', '==', user.email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new KioskAccessError('Kiosk access not enabled.', 403);
  }

  const doc = snapshot.docs[0]!;
  const data = doc.data();
  const role = resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });
  const kioskEnabled = data.kioskEnabled === true;

  if (role !== 'admin' && role !== 'master' && role !== 'kiosk' && !kioskEnabled) {
    throw new KioskAccessError('Kiosk access not enabled.', 403);
  }

  if (data.active === false) {
    throw new KioskAccessError('This kiosk account is inactive.', 403);
  }

  return {
    uid: user.uid,
    email: user.email,
    employeeDocId: doc.id,
    employeeId: typeof data.employeeId === 'string' ? data.employeeId : '',
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : user.email,
    role,
    isKioskAccount: role === 'kiosk',
    locationId: typeof data.locationId === 'string' ? data.locationId.trim() : '',
    locationGroupId:
      typeof data.locationGroupId === 'string' ? data.locationGroupId.trim() : '',
    kioskEnabled,
  };
}

export async function loadKioskAllowedLocations(
  operator: KioskOperator,
): Promise<{
  locations: Location[];
  group: LocationGroup | null;
  options: KioskLocationOption[];
}> {
  const db = getAdminFirestore();
  const [locationsSnap, groupDoc] = await Promise.all([
    db.collection(COLLECTIONS.LOCATIONS).get(),
    operator.locationGroupId
      ? db.collection(COLLECTIONS.LOCATION_GROUPS).doc(operator.locationGroupId).get()
      : Promise.resolve(null),
  ]);

  const locations = locationsSnap.docs.map((document) =>
    mapLocationDoc(document.id, document.data()),
  );
  const group =
    groupDoc?.exists
      ? mapLocationGroupDoc(groupDoc.id, groupDoc.data() ?? {})
      : null;

  const allowed = getAllowedLocationsForEmployee(
    {
      locationId: operator.locationId,
      locationGroupId: operator.locationGroupId,
    },
    locations,
    group ? [group] : [],
  );

  return {
    locations,
    group,
    options: allowed.map((location) => ({
      id: location.id,
      name: location.name,
      city: location.city,
    })),
  };
}

export async function buildKioskContext(operator: KioskOperator): Promise<KioskContext> {
  const { options } = await loadKioskAllowedLocations(operator);
  const defaultLocationId =
    (operator.locationId && options.some((item) => item.id === operator.locationId)
      ? operator.locationId
      : options[0]?.id) ?? '';

  return {
    operatorEmployeeDocId: operator.employeeDocId,
    operatorName: operator.name,
    operatorEmail: operator.email,
    isKioskAccount: operator.isKioskAccount,
    canChangeLocation: Boolean(operator.locationGroupId) && options.length > 1,
    allowedLocations: options,
    defaultLocationId,
  };
}

export function assertLocationAllowedForOperator(
  locationId: string,
  allowed: readonly KioskLocationOption[],
): KioskLocationOption {
  const match = allowed.find((item) => item.id === locationId.trim());
  if (!match) {
    throw new KioskAccessError(
      'This kiosk is not assigned to that client.',
      403,
    );
  }
  return match;
}
