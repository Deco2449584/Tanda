import { FieldValue } from 'firebase-admin/firestore';

const ALLOWED_UPDATE_KEYS = new Set([
  'employeeId',
  'name',
  'email',
  'department',
  'photoUrl',
  'active',
  'kioskEnabled',
  'continentalInspectEnabled',
  'continentalInspectAdmin',
  'webInspectionsEnabled',
  'allowCheckInWithoutScheduledShift',
  'allowPunchOutsideGeofence',
  'locationId',
  'locationGroupId',
  'phone',
  'dateOfBirth',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postcode',
  'country',
  'emergencyContactName',
  'emergencyContactPhone',
  'passportNumber',
  'passportUrl',
  'passportFileName',
  'visaUrl',
  'visaFileName',
  'visaExpiry',
  'startDate',
  'endDate',
]);

/**
 * Build an Admin SDK update from a plain JSON body.
 * Keys listed in `deleteFields` become FieldValue.delete().
 */
export function buildAdminEmployeeUpdate(input: {
  fields?: Record<string, unknown>;
  deleteFields?: string[];
}): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  const fields = input.fields ?? {};
  const deleteFields = input.deleteFields ?? [];

  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_UPDATE_KEYS.has(key)) continue;
    if (value === undefined) continue;
    update[key] = value;
  }

  for (const key of deleteFields) {
    if (!ALLOWED_UPDATE_KEYS.has(key)) continue;
    update[key] = FieldValue.delete();
  }

  return update;
}
