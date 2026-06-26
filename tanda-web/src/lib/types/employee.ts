import type { Timestamp } from 'firebase/firestore';

/** Optional personal and immigration details stored on the employee record. */
export interface EmployeePersonalDetails {
  phone?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  passportNumber?: string;
  passportUrl?: string;
  passportFileName?: string;
  visaUrl?: string;
  visaFileName?: string;
  visaExpiry?: string;
}

export interface EmployeeFirestore extends EmployeePersonalDetails {
  employeeId: string;
  name: string;
  email: string;
  /** Optional access role, e.g. "Admin". */
  role?: string;
  department: string;
  locationId?: string;
  locationGroupId?: string;
  hourlyRate: number;
  active: boolean;
  /** ISO date (YYYY-MM-DD) when the employee started. */
  startDate?: string;
  /** ISO date (YYYY-MM-DD) when the employee left; empty while still employed. */
  endDate?: string;
  /** Grants access to the /kiosk check-in module from the employee's own device. */
  kioskEnabled?: boolean;
  lastAction: string;
  lastTimestampServer?: Timestamp;
  photoUrl?: string;
  /** Firebase Auth user id once an invite has been sent. */
  authUid?: string;
  /** Server-managed via push notification API routes. */
  pushSubscription?: string;
  notificationsEnabledAt?: Timestamp;
  inviteSentAt?: Timestamp;
}

export interface Employee extends EmployeeFirestore {
  id: string;
}

export interface CreateEmployeeInput {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  locationId?: string;
  locationGroupId?: string;
  hourlyRate: number;
}

export interface CreateEmployeeFormValues extends CreateEmployeeInput, EmployeePersonalDetails {
  startDate?: string;
  endDate?: string;
}
