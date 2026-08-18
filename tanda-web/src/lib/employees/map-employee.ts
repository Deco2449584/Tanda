import type {
  Employee,
  EmployeeFirestore,
  PersonalProfileStatus,
} from '@/lib/types/employee';
import { PERSONAL_PROFILE_STATUSES } from '@/lib/types/employee';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import { mapStaffPayRates } from '@/lib/payroll/map-pay-rules';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function mapPersonalProfileStatus(value: unknown): PersonalProfileStatus {
  if (
    typeof value === 'string' &&
    (PERSONAL_PROFILE_STATUSES as readonly string[]).includes(value)
  ) {
    return value as PersonalProfileStatus;
  }
  return 'none';
}

export function mapEmployeeDoc(
  id: string,
  data: Record<string, unknown>,
): Employee {
  const employee = data as Partial<EmployeeFirestore>;

  return {
    id,
    employeeId:
      typeof employee.employeeId === 'string' ? employee.employeeId.trim() : '',
    name: employee.name ?? 'No name',
    email:
      typeof employee.email === 'string'
        ? employee.email.trim().toLowerCase()
        : '',
    role: typeof employee.role === 'string' ? employee.role.trim() : undefined,
    adminRoleId: optionalString(employee.adminRoleId),
    modulePermissions: employee.modulePermissions
      ? mapModulePermissions(employee.modulePermissions)
      : undefined,
    department: employee.department ?? '',
    locationId: optionalString(employee.locationId),
    locationGroupId: optionalString(employee.locationGroupId),
    hourlyRate: typeof employee.hourlyRate === 'number' ? employee.hourlyRate : 0,
    employmentTypeId: optionalString(employee.employmentTypeId),
    payRates: mapStaffPayRates(employee.payRates),
    payRateHistory: Array.isArray(employee.payRateHistory)
      ? employee.payRateHistory
          .map((item) => mapStaffPayRates(item))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : undefined,
    active: employee.active ?? false,
    kioskEnabled: employee.kioskEnabled === true,
    allowCheckInWithoutScheduledShift:
      employee.allowCheckInWithoutScheduledShift === true,
    lastAction: employee.lastAction ?? 'none',
    lastTimestampServer: employee.lastTimestampServer,
    photoUrl: typeof employee.photoUrl === 'string' ? employee.photoUrl : '',
    phone: optionalString(employee.phone),
    dateOfBirth: optionalString(employee.dateOfBirth),
    addressLine1: optionalString(employee.addressLine1),
    addressLine2: optionalString(employee.addressLine2),
    city: optionalString(employee.city),
    state: optionalString(employee.state),
    postcode: optionalString(employee.postcode),
    country: optionalString(employee.country),
    emergencyContactName: optionalString(employee.emergencyContactName),
    emergencyContactPhone: optionalString(employee.emergencyContactPhone),
    passportNumber: optionalString(employee.passportNumber),
    passportUrl: optionalString(employee.passportUrl),
    passportFileName: optionalString(employee.passportFileName),
    visaUrl: optionalString(employee.visaUrl),
    visaFileName: optionalString(employee.visaFileName),
    visaExpiry: optionalString(employee.visaExpiry),
    startDate: optionalString(employee.startDate),
    endDate: optionalString(employee.endDate),
    authUid: optionalString(employee.authUid),
    inviteSentAt: employee.inviteSentAt,
    personalProfileStatus: mapPersonalProfileStatus(employee.personalProfileStatus),
    personalProfileSubmittedAt: employee.personalProfileSubmittedAt,
    personalProfileReviewedAt: employee.personalProfileReviewedAt,
    personalProfileRejectionReason: optionalString(
      employee.personalProfileRejectionReason,
    ),
  };
}
