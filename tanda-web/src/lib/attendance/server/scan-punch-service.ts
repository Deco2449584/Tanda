import { FieldValue } from 'firebase-admin/firestore';
import {
  loadEmployeeAttendanceActionRecords,
  loadEmployeeAttendanceRecords,
  presenceVersionFromEmployeeData,
  reconcileEmployeePresence,
} from '@/lib/attendance/server/employee-presence';
import {
  findOpenCheckInRecord,
  validateCheckoutSameLocationAsCheckIn,
} from '@/lib/attendance/server/open-attendance-session';
import { evaluateLateCheckIn } from '@/lib/attendance/server/attendance-alerts-service';
import {
  logAttendanceRestrictionBlocked,
  loadCompanySettingsAdmin,
  validateEmployeeCheckInRestrictions,
} from '@/lib/attendance/server/validate-attendance-restrictions';
import {
  resolveAllowedAttendanceActions,
  resolveAttendanceAction,
  resolveAttendanceState,
  type AttendanceWorkState,
} from '@/lib/attendance/resolve-attendance-action';
import type { EmployeeContext } from '@/lib/auth/load-employee-context';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  isValidLatitude,
  isValidLongitude,
  reverseGeocode,
} from '@/lib/geo/reverse-geocode';
import { canEmployeePunchAtKiosk } from '@/lib/location-groups/can-punch-at-location';
import { mapLocationGroupDoc } from '@/lib/location-groups/map-location-group';
import type { AttendanceType } from '@/lib/types/attendance';

const PUNCH_MAX_ATTEMPTS = 3;

export interface ScanPunchResult {
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  locationId: string;
  locationName: string;
  locationCity: string;
  actionType: AttendanceType;
  allowedActions: AttendanceType[];
  state: AttendanceWorkState;
  recordedAt: string;
}

export async function recordScanPunch(input: {
  employee: EmployeeContext;
  token: string;
  /** How the staff opened the link: QR printout vs NFC tag. */
  via?: 'qr' | 'nfc';
  latitude?: number;
  longitude?: number;
  geoAccuracy?: number;
  geoCapturedAt?: string;
}): Promise<ScanPunchResult> {
  const token = input.token.trim();
  if (!token) {
    throw new ScanPunchError('Scan token is required.', 400);
  }

  const scanSource =
    input.via === 'nfc' ? 'web-scan-nfc' : 'web-scan-qr';

  const location = await requireScanLocation(token);
  const employeeDoc = await requireAuthorizedSessionEmployee(
    input.employee,
    location.id,
  );

  const employeeDocId = employeeDoc.id;
  const employeeCode = employeeDoc.employeeId;
  const employeeName = employeeDoc.name;
  const employeeEmail = employeeDoc.email;

  const settings = await loadCompanySettingsAdmin();
  const timeZone = settings.timeZone;

  let actionType: AttendanceType = 'check_in';
  let allowedActions: AttendanceType[] = ['check_in'];
  let state: AttendanceWorkState = 'off_duty';
  let recordedAt = new Date().toISOString();

  for (let attempt = 0; attempt < PUNCH_MAX_ATTEMPTS; attempt += 1) {
    const [records, fullRecords, employeeSnapshot] = await Promise.all([
      loadEmployeeAttendanceActionRecords(employeeCode),
      loadEmployeeAttendanceRecords(employeeCode),
      getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(employeeDocId).get(),
    ]);

    if (!employeeSnapshot.exists) {
      throw new ScanPunchError('Employee not found.', 404);
    }

    const employeeData = employeeSnapshot.data() ?? {};
    const expectedVersion = presenceVersionFromEmployeeData(employeeData);
    state = resolveAttendanceState({ records, timeZone });
    allowedActions = resolveAllowedAttendanceActions({ records, timeZone });
    actionType = resolveAttendanceAction({ records, timeZone });

    if (!allowedActions.includes(actionType)) {
      throw new ScanPunchError(
        'No punch action is available right now. Try again shortly.',
        409,
      );
    }

    if (actionType === 'check_in') {
      const punchAt = new Date();
      const violation = await validateEmployeeCheckInRestrictions({
        employeeId: employeeCode,
        punchAt,
      });

      if (violation) {
        await logAttendanceRestrictionBlocked({
          actorEmail: employeeEmail,
          employeeId: employeeCode,
          employeeName,
          channel: 'scan',
          violation,
          punchAt,
          metadata: {
            locationId: location.id,
            scanTokenPrefix: token.slice(0, 8),
            via: input.via ?? 'qr',
          },
        });
        throw new ScanPunchError(violation.message, 403);
      }
    }

    if (actionType === 'check_out') {
      const openCheckIn = findOpenCheckInRecord(fullRecords, timeZone);
      const locationViolation = validateCheckoutSameLocationAsCheckIn({
        openCheckIn,
        kioskLocationId: location.id,
      });

      if (locationViolation) {
        throw new ScanPunchError(locationViolation.message, 403);
      }
    }

    // Keep geo on the critical path light — reverse geocode after write.
    const geoFields: Record<string, unknown> = {};
    const hasGeo =
      isValidLatitude(input.latitude) && isValidLongitude(input.longitude);
    if (hasGeo) {
      geoFields.latitude = input.latitude;
      geoFields.longitude = input.longitude;
      if (
        typeof input.geoAccuracy === 'number' &&
        Number.isFinite(input.geoAccuracy)
      ) {
        geoFields.geoAccuracy = input.geoAccuracy;
      }
      if (typeof input.geoCapturedAt === 'string' && input.geoCapturedAt.trim()) {
        geoFields.geoCapturedAt = input.geoCapturedAt.trim();
      }
    }

    const db = getAdminFirestore();
    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeDocId);
    const attendanceRef = db.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc();

    try {
      recordedAt = await db.runTransaction(async (transaction) => {
        const currentEmployee = await transaction.get(employeeRef);
        if (!currentEmployee.exists) {
          throw new ScanPunchError('Employee not found.', 404);
        }

        const currentData = currentEmployee.data() ?? {};
        const currentVersion = presenceVersionFromEmployeeData(currentData);
        if (currentVersion !== expectedVersion) {
          throw new ScanPunchConflictError();
        }

        const currentAllowed = resolveAllowedAttendanceActions({
          records,
          timeZone,
        });
        if (!currentAllowed.includes(actionType)) {
          throw new ScanPunchConflictError();
        }

        transaction.set(attendanceRef, {
          employeeId: employeeCode,
          employeeNameSnapshot: employeeName,
          employeeEmailSnapshot: employeeEmail,
          type: actionType,
          timestampServer: FieldValue.serverTimestamp(),
          source: scanSource,
          photoCaptured: false,
          photoUrl: '',
          locationId: location.id,
          locationNameSnapshot: location.name,
          locationCitySnapshot: location.city,
          createdByEmail: employeeEmail,
          createdByUid: input.employee.uid,
          ...(actionType === 'check_out' ? { breakWaived: false } : {}),
          ...geoFields,
        });

        transaction.update(employeeRef, {
          lastAction: actionType,
          lastTimestampServer: FieldValue.serverTimestamp(),
        });

        return new Date().toISOString();
      });

      // Enrich address after the punch succeeds (do not block the response).
      if (hasGeo) {
        void reverseGeocode(input.latitude!, input.longitude!)
          .then(async (address) => {
            if (!address) return;
            await attendanceRef.update({ geoAddress: address });
          })
          .catch(() => undefined);
      }

      break;
    } catch (error) {
      if (error instanceof ScanPunchConflictError) {
        if (attempt === PUNCH_MAX_ATTEMPTS - 1) {
          throw new ScanPunchError(
            'Attendance state changed. Scan again to continue.',
            409,
          );
        }
        continue;
      }
      throw error;
    }
  }

  // Late alerts + presence reconcile after response path is prepared —
  // still awaited so presence stays consistent, but geocode no longer blocks.
  if (actionType === 'check_in') {
    void evaluateLateCheckIn({
      employeeId: employeeCode,
      checkInAt: new Date(recordedAt),
    }).catch((error) => {
      console.error('scan-punch evaluateLateCheckIn', error);
    });
  }

  void reconcileEmployeePresence(employeeDocId, employeeCode).catch((error) => {
    console.error('scan-punch reconcileEmployeePresence', error);
  });

  return {
    employeeDocId,
    employeeId: employeeCode,
    employeeName,
    employeeEmail,
    locationId: location.id,
    locationName: location.name,
    locationCity: location.city,
    actionType,
    allowedActions,
    state,
    recordedAt,
  };
}

async function requireScanLocation(token: string): Promise<{
  id: string;
  name: string;
  city: string;
}> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.LOCATIONS)
    .where('scanPunchToken', '==', token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new ScanPunchError('This scan link is invalid or has been rotated.', 404);
  }

  const doc = snapshot.docs[0]!;
  const data = doc.data();

  if (data.active === false) {
    throw new ScanPunchError('This client is inactive.', 403);
  }

  if (data.scanPunchEnabled !== true) {
    throw new ScanPunchError('Scan clock-in is not enabled for this client.', 403);
  }

  return {
    id: doc.id,
    name: typeof data.name === 'string' ? data.name : 'Client',
    city: typeof data.city === 'string' ? data.city : '',
  };
}

async function requireAuthorizedSessionEmployee(
  employee: EmployeeContext,
  locationId: string,
): Promise<{
  id: string;
  employeeId: string;
  name: string;
  email: string;
}> {
  const employeeSnapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employee.employeeDocId)
    .get();

  if (!employeeSnapshot.exists) {
    throw new ScanPunchError('Employee not found.', 404);
  }

  const data = employeeSnapshot.data() ?? {};

  if (data.active === false) {
    throw new ScanPunchError(
      'This employee is inactive. Contact your administrator.',
      403,
    );
  }

  const employeeId =
    typeof data.employeeId === 'string' && data.employeeId.trim()
      ? data.employeeId.trim()
      : employee.employeeId;

  if (!employeeId) {
    throw new ScanPunchError('Employee code is missing on your profile.', 400);
  }

  const employeeLocationId =
    typeof data.locationId === 'string' ? data.locationId.trim() : '';
  const locationGroupId =
    typeof data.locationGroupId === 'string' ? data.locationGroupId.trim() : '';

  if (!employeeLocationId && !locationGroupId) {
    throw new ScanPunchError(
      'You are not assigned to any client for clock-in.',
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
      locationId,
      group,
    )
  ) {
    throw new ScanPunchError(
      'You are not authorized to clock in at this client.',
      403,
    );
  }

  return {
    id: employeeSnapshot.id,
    employeeId,
    name:
      typeof data.name === 'string' && data.name.trim()
        ? data.name.trim()
        : employee.name,
    email: employee.email,
  };
}

export class ScanPunchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

class ScanPunchConflictError extends Error {
  constructor() {
    super('Attendance state conflict.');
  }
}
