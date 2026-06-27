import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { evaluateLateCheckIn } from '@/lib/attendance/server/attendance-alerts-service';
import {
  logAttendanceRestrictionBlocked,
  validateEmployeeCheckInRestrictions,
} from '@/lib/attendance/server/validate-attendance-restrictions';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  isValidLatitude,
  isValidLongitude,
  reverseGeocode,
} from '@/lib/geo/reverse-geocode';
import { canEmployeePunchAtKiosk } from '@/lib/location-groups/can-punch-at-location';
import { mapLocationGroupDoc } from '@/lib/location-groups/map-location-group';
import { findKioskDeviceByToken } from '@/lib/kiosk/server/kiosk-devices-service';
import { resolveKioskAction } from '@/lib/kiosk/resolve-kiosk-action';

export interface KioskLookupResult {
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  actionType: 'check_in' | 'check_out';
}

export async function lookupKioskEmployee(input: {
  deviceToken: string;
  employeePin: string;
}): Promise<KioskLookupResult> {
  const device = await requireActiveKioskDevice(input.deviceToken);
  const employee = await requireAuthorizedEmployee(
    input.employeePin,
    device.locationId!,
  );

  const actionType = resolveKioskAction(
    employee.data.lastAction as string | undefined,
    employee.data.lastTimestampServer as { toDate(): Date } | undefined,
  );

  return {
    employeeDocId: employee.id,
    employeeId: employee.data.employeeId as string,
    employeeName: employee.data.name as string,
    employeeEmail: employee.data.email as string,
    actionType,
  };
}

export async function recordKioskPunch(input: {
  deviceToken: string;
  employeePin: string;
  photoPath: string;
  photoUrl: string;
  latitude?: number;
  longitude?: number;
  geoAccuracy?: number;
  geoCapturedAt?: string;
}): Promise<KioskLookupResult & { recordedAt: string }> {
  const device = await requireActiveKioskDevice(input.deviceToken);
  const employee = await requireAuthorizedEmployee(
    input.employeePin,
    device.locationId!,
  );

  const actionType = resolveKioskAction(
    employee.data.lastAction as string | undefined,
    employee.data.lastTimestampServer as { toDate(): Date } | undefined,
  );

  if (actionType === 'check_in') {
    const punchAt = new Date();
    const violation = await validateEmployeeCheckInRestrictions({
      employeeId: employee.data.employeeId as string,
      punchAt,
    });

    if (violation) {
      await logAttendanceRestrictionBlocked({
        actorEmail: device.createdBy ?? device.ownerEmail ?? 'kiosk@device',
        employeeId: employee.data.employeeId as string,
        employeeName: employee.data.name as string,
        channel: 'kiosk',
        violation,
        punchAt,
        metadata: {
          kioskDeviceId: device.id,
          kioskDeviceName: device.name,
        },
      });
      throw new KioskPunchError(violation.message, 403);
    }
  }

  const locationDoc = await getAdminFirestore()
    .collection(COLLECTIONS.LOCATIONS)
    .doc(device.locationId!)
    .get();

  const locationData = locationDoc.data() ?? {};

  const geoFields: Record<string, unknown> = {};
  if (isValidLatitude(input.latitude) && isValidLongitude(input.longitude)) {
    geoFields.latitude = input.latitude;
    geoFields.longitude = input.longitude;
    if (typeof input.geoAccuracy === 'number' && Number.isFinite(input.geoAccuracy)) {
      geoFields.geoAccuracy = input.geoAccuracy;
    }
    if (typeof input.geoCapturedAt === 'string' && input.geoCapturedAt.trim()) {
      geoFields.geoCapturedAt = input.geoCapturedAt.trim();
    }

    const address = await reverseGeocode(input.latitude, input.longitude);
    if (address) {
      geoFields.geoAddress = address;
    }
  }

  const db = getAdminFirestore();
  await db.collection(COLLECTIONS.ATTENDANCE_RECORDS).add({
    employeeId: employee.data.employeeId,
    employeeNameSnapshot: employee.data.name,
    employeeEmailSnapshot: employee.data.email,
    type: actionType,
    timestampServer: FieldValue.serverTimestamp(),
    source: 'web-kiosk',
    photoCaptured: true,
    photoPath: input.photoPath,
    photoUrl: input.photoUrl,
    locationId: device.locationId,
    locationNameSnapshot: typeof locationData.name === 'string' ? locationData.name : '',
    locationCitySnapshot: typeof locationData.city === 'string' ? locationData.city : '',
    kioskDeviceId: device.id,
    kioskDeviceNameSnapshot: device.name ?? '',
    kioskDeviceType: device.type,
    ...(actionType === 'check_out' ? { breakWaived: false } : {}),
    ...geoFields,
  });

  await db.collection(COLLECTIONS.EMPLOYEES).doc(employee.id).update({
    lastAction: actionType,
    lastTimestampServer: FieldValue.serverTimestamp(),
  });

  if (actionType === 'check_in') {
    await evaluateLateCheckIn({
      employeeId: employee.data.employeeId as string,
      checkInAt: new Date(),
    });
  }

  return {
    employeeDocId: employee.id,
    employeeId: employee.data.employeeId as string,
    employeeName: employee.data.name as string,
    employeeEmail: employee.data.email as string,
    actionType,
    recordedAt: new Date().toISOString(),
  };
}

async function requireActiveKioskDevice(token: string) {
  const device = await findKioskDeviceByToken(token);
  if (!device) {
    throw new KioskPunchError('Device not registered.', 404);
  }
  if (device.status !== 'active' || !device.locationId) {
    throw new KioskPunchError('This kiosk is no longer active.', 403);
  }
  return device;
}

async function requireAuthorizedEmployee(employeePin: string, kioskLocationId: string) {
  const cleanPin = employeePin.trim();
  if (!cleanPin) {
    throw new KioskPunchError('Employee PIN is required.', 400);
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('employeeId', '==', cleanPin)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new KioskPunchError('Invalid or unknown employee PIN.', 404);
  }

  const employeeDoc = snapshot.docs[0];
  const data = employeeDoc.data();

  if (data.active === false) {
    throw new KioskPunchError(
      'This employee is inactive. Contact your administrator.',
      403,
    );
  }

  const employeeLocationId =
    typeof data.locationId === 'string' ? data.locationId.trim() : '';
  const locationGroupId =
    typeof data.locationGroupId === 'string' ? data.locationGroupId.trim() : '';

  if (!employeeLocationId && !locationGroupId) {
    throw new KioskPunchError(
      'You are not authorized to clock in at this warehouse.',
      403,
    );
  }

  let group = null;
  if (locationGroupId) {
    const groupDoc = await getAdminFirestore()
      .collection(COLLECTIONS.LOCATION_GROUPS)
      .doc(locationGroupId)
      .get();

    if (groupDoc.exists) {
      group = mapLocationGroupDoc(groupDoc.id, groupDoc.data() ?? {});
    }
  }

  if (
    !canEmployeePunchAtKiosk(
      { locationId: employeeLocationId, locationGroupId },
      kioskLocationId,
      group,
    )
  ) {
    throw new KioskPunchError(
      'You are not authorized to clock in at this warehouse.',
      403,
    );
  }

  return { id: employeeDoc.id, data };
}

export class KioskPunchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
