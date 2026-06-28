import { FieldValue } from 'firebase-admin/firestore';
import {
  loadEmployeeAttendanceActionRecords,
  presenceVersionFromEmployeeData,
  reconcileEmployeePresence,
} from '@/lib/attendance/server/employee-presence';
import { evaluateLateCheckIn } from '@/lib/attendance/server/attendance-alerts-service';
import {
  logAttendanceRestrictionBlocked,
  loadCompanySettingsAdmin,
  validateEmployeeCheckInRestrictions,
} from '@/lib/attendance/server/validate-attendance-restrictions';
import {
  resolveAttendanceAction,
} from '@/lib/attendance/resolve-attendance-action';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  isValidLatitude,
  isValidLongitude,
  reverseGeocode,
} from '@/lib/geo/reverse-geocode';
import { canEmployeePunchAtKiosk } from '@/lib/location-groups/can-punch-at-location';
import { mapLocationGroupDoc } from '@/lib/location-groups/map-location-group';
import { findKioskDeviceByToken } from '@/lib/kiosk/server/kiosk-devices-service';

export interface KioskLookupResult {
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  actionType: 'check_in' | 'check_out';
}

const PUNCH_MAX_ATTEMPTS = 3;

export async function lookupKioskEmployee(input: {
  deviceToken: string;
  employeePin: string;
}): Promise<KioskLookupResult> {
  const device = await requireActiveKioskDevice(input.deviceToken);
  const employee = await requireAuthorizedEmployee(
    input.employeePin,
    device.locationId!,
  );

  const employeeCode = employee.data.employeeId as string;
  const [settings, records] = await Promise.all([
    loadCompanySettingsAdmin(),
    loadEmployeeAttendanceActionRecords(employeeCode),
  ]);

  const actionType = resolveAttendanceAction({
    records,
    timeZone: settings.timeZone,
  });

  return {
    employeeDocId: employee.id,
    employeeId: employeeCode,
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

  const employeeDocId = employee.id;
  const employeeCode = employee.data.employeeId as string;
  const employeeName = employee.data.name as string;
  const employeeEmail = employee.data.email as string;

  const settings = await loadCompanySettingsAdmin();
  const timeZone = settings.timeZone;

  let actionType: 'check_in' | 'check_out' = 'check_in';
  let recordedAt = new Date().toISOString();

  for (let attempt = 0; attempt < PUNCH_MAX_ATTEMPTS; attempt += 1) {
    const [records, employeeSnapshot] = await Promise.all([
      loadEmployeeAttendanceActionRecords(employeeCode),
      getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(employeeDocId).get(),
    ]);

    if (!employeeSnapshot.exists) {
      throw new KioskPunchError('Employee not found.', 404);
    }

    const employeeData = employeeSnapshot.data() ?? {};
    const expectedVersion = presenceVersionFromEmployeeData(employeeData);
    actionType = resolveAttendanceAction({ records, timeZone });

    if (actionType === 'check_in') {
      const punchAt = new Date();
      const violation = await validateEmployeeCheckInRestrictions({
        employeeId: employeeCode,
        punchAt,
      });

      if (violation) {
        await logAttendanceRestrictionBlocked({
          actorEmail: device.createdBy ?? device.ownerEmail ?? 'kiosk@device',
          employeeId: employeeCode,
          employeeName,
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
    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeDocId);
    const attendanceRef = db.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc();

    try {
      recordedAt = await db.runTransaction(async (transaction) => {
        const currentEmployee = await transaction.get(employeeRef);
        if (!currentEmployee.exists) {
          throw new KioskPunchError('Employee not found.', 404);
        }

        const currentData = currentEmployee.data() ?? {};
        const currentVersion = presenceVersionFromEmployeeData(currentData);
        if (currentVersion !== expectedVersion) {
          throw new KioskPunchConflictError();
        }

        const currentAction = resolveAttendanceAction({ records, timeZone });
        if (currentAction !== actionType) {
          throw new KioskPunchConflictError();
        }

        transaction.set(attendanceRef, {
          employeeId: employeeCode,
          employeeNameSnapshot: employeeName,
          employeeEmailSnapshot: employeeEmail,
          type: actionType,
          timestampServer: FieldValue.serverTimestamp(),
          source: 'web-kiosk',
          photoCaptured: true,
          photoPath: input.photoPath,
          photoUrl: input.photoUrl,
          locationId: device.locationId,
          locationNameSnapshot:
            typeof locationData.name === 'string' ? locationData.name : '',
          locationCitySnapshot:
            typeof locationData.city === 'string' ? locationData.city : '',
          kioskDeviceId: device.id,
          kioskDeviceNameSnapshot: device.name ?? '',
          kioskDeviceType: device.type,
          ...(actionType === 'check_out' ? { breakWaived: false } : {}),
          ...geoFields,
        });

        transaction.update(employeeRef, {
          lastAction: actionType,
          lastTimestampServer: FieldValue.serverTimestamp(),
        });

        return new Date().toISOString();
      });

      break;
    } catch (error) {
      if (error instanceof KioskPunchConflictError) {
        if (attempt === PUNCH_MAX_ATTEMPTS - 1) {
          throw new KioskPunchError(
            'Attendance state changed. Please enter your PIN again.',
            409,
          );
        }
        continue;
      }
      throw error;
    }
  }

  if (actionType === 'check_in') {
    await evaluateLateCheckIn({
      employeeId: employeeCode,
      checkInAt: new Date(recordedAt),
    });
  }

  await reconcileEmployeePresence(employeeDocId, employeeCode);

  return {
    employeeDocId,
    employeeId: employeeCode,
    employeeName,
    employeeEmail,
    actionType,
    recordedAt,
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

class KioskPunchConflictError extends Error {
  constructor() {
    super('Attendance state conflict.');
  }
}
