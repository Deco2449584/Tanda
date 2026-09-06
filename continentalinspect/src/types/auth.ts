export type UserRole = 'admin' | 'operator';

/** Document shape in Firestore `employees` collection. */
export type EmployeeRecord = {
  email: string;
  active: boolean;
  continentalInspectEnabled: boolean;
  name: string;
  department: string;
  employeeId: string;
  photoUrl?: string;
  locationId?: string;
  locationGroupId?: string;
};

/** Authenticated employee profile used in the app (role is derived). */
export type EmployeeProfile = EmployeeRecord & {
  /** Firestore document id */
  docId: string;
  role: UserRole;
};

/** @deprecated Use EmployeeProfile */
export type UserProfile = EmployeeProfile;
