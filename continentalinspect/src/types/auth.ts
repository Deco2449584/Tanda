export type UserRole = 'admin' | 'operator';

/** Document shape in Firestore `employees` collection. */
export type EmployeeRecord = {
  email: string;
  active: boolean;
  continentalInspectEnabled: boolean;
  /** TimeTracker toggle: Inspect admin (export, edit, all clients). */
  continentalInspectAdmin?: boolean;
  name: string;
  department: string;
  employeeId: string;
  photoUrl?: string;
  locationId?: string;
  locationGroupId?: string;
  /**
   * Firestore workforce `role` (master / admin / empleado / kiosk).
   * Separate from in-app `EmployeeProfile.role` (admin | operator).
   */
  workforceRole?: string;
};

/** Authenticated employee profile used in the app (role is derived). */
export type EmployeeProfile = EmployeeRecord & {
  /** Firestore document id */
  docId: string;
  role: UserRole;
};

/** @deprecated Use EmployeeProfile */
export type UserProfile = EmployeeProfile;
