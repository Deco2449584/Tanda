export interface DataPurgeDateRange {
  /** Inclusive YYYY-MM-DD. Empty = no lower bound. */
  startDate: string;
  /** Inclusive YYYY-MM-DD. Empty = no upper bound. */
  endDate: string;
}

export interface DataPurgeOptions {
  attendanceRecords: boolean;
  attendanceStorage: boolean;
  attendanceJustifications: boolean;
  shifts: boolean;
  leaveRequests: boolean;
  notifications: boolean;
  notificationPreferences: boolean;
  announcements: boolean;
  cargoInspections: boolean;
  cargoInspectionsStorage: boolean;
  portalClients: boolean;
  locations: boolean;
  locationGroups: boolean;
  kioskDevices: boolean;
  kioskLoginLogs: boolean;
  employeeDocumentsStorage: boolean;
  employeeCustomFieldValues: boolean;
  employeeCustomFields: boolean;
  issueReports: boolean;
  issueReportsStorage: boolean;
  helpTutorials: boolean;
  helpTutorialsStorage: boolean;
  accountingPeriodLocks: boolean;
  authSessions: boolean;
  auditLogs: boolean;
  courses: boolean;
  courseEnrollments: boolean;
  courseEvidenceStorage: boolean;
  /** Firebase Auth users with no matching employee email (and not the acting master). */
  orphanedAuthUsers: boolean;
  resetEmployeePresence: boolean;
  /** Clear passport/visa URL fields when employee documents storage is purged. */
  clearEmployeeDocumentRefs: boolean;
  /** Clear locationId / locationGroupId when locations or groups are purged. */
  clearEmployeeLocationRefs: boolean;
}

export interface DataPurgeResult {
  attendanceRecordsDeleted: number;
  storageFilesDeleted: number;
  attendanceJustificationsDeleted: number;
  shiftsDeleted: number;
  leaveRequestsDeleted: number;
  notificationsDeleted: number;
  notificationPreferencesDeleted: number;
  announcementsDeleted: number;
  cargoInspectionsDeleted: number;
  cargoInspectionsStorageDeleted: number;
  portalClientsDeleted: number;
  locationsDeleted: number;
  locationGroupsDeleted: number;
  kioskDevicesDeleted: number;
  kioskLoginLogsDeleted: number;
  employeeDocumentsStorageDeleted: number;
  employeeCustomFieldValuesDeleted: number;
  employeeCustomFieldsDeleted: number;
  issueReportsDeleted: number;
  issueReportsStorageDeleted: number;
  helpTutorialsDeleted: number;
  helpTutorialsStorageDeleted: number;
  accountingPeriodLocksDeleted: number;
  authSessionsDeleted: number;
  auditLogsDeleted: number;
  coursesDeleted: number;
  courseEnrollmentsDeleted: number;
  courseEvidenceStorageDeleted: number;
  orphanedAuthUsersDeleted: number;
  employeesReset: number;
  employeeDocumentRefsCleared: number;
  employeeLocationRefsCleared: number;
  errors: string[];
}

export type PurgeProgressCallback = (message: string) => void;

export function createEmptyPurgeResult(): DataPurgeResult {
  return {
    attendanceRecordsDeleted: 0,
    storageFilesDeleted: 0,
    attendanceJustificationsDeleted: 0,
    shiftsDeleted: 0,
    leaveRequestsDeleted: 0,
    notificationsDeleted: 0,
    notificationPreferencesDeleted: 0,
    announcementsDeleted: 0,
    cargoInspectionsDeleted: 0,
    cargoInspectionsStorageDeleted: 0,
    portalClientsDeleted: 0,
    locationsDeleted: 0,
    locationGroupsDeleted: 0,
    kioskDevicesDeleted: 0,
    kioskLoginLogsDeleted: 0,
    employeeDocumentsStorageDeleted: 0,
    employeeCustomFieldValuesDeleted: 0,
    employeeCustomFieldsDeleted: 0,
    issueReportsDeleted: 0,
    issueReportsStorageDeleted: 0,
    helpTutorialsDeleted: 0,
    helpTutorialsStorageDeleted: 0,
    accountingPeriodLocksDeleted: 0,
    authSessionsDeleted: 0,
    auditLogsDeleted: 0,
    coursesDeleted: 0,
    courseEnrollmentsDeleted: 0,
    courseEvidenceStorageDeleted: 0,
    orphanedAuthUsersDeleted: 0,
    employeesReset: 0,
    employeeDocumentRefsCleared: 0,
    employeeLocationRefsCleared: 0,
    errors: [],
  };
}

export function hasDateRangeFilter(range?: DataPurgeDateRange | null): boolean {
  if (!range) return false;
  return Boolean(range.startDate?.trim() || range.endDate?.trim());
}

export function purgeOptionsHasWork(options: DataPurgeOptions): boolean {
  return Object.values(options).some(Boolean);
}

export function purgeResultHasSuccess(result: DataPurgeResult): boolean {
  return Object.entries(result).some(
    ([key, value]) => key !== 'errors' && typeof value === 'number' && value > 0,
  );
}
