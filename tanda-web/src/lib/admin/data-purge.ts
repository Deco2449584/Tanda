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
    employeesReset: 0,
    employeeDocumentRefsCleared: 0,
    employeeLocationRefsCleared: 0,
    errors: [],
  };
}

export function purgeOptionsHasWork(options: DataPurgeOptions): boolean {
  return Object.values(options).some(Boolean);
}

export function purgeResultHasSuccess(result: DataPurgeResult): boolean {
  return Object.entries(result).some(
    ([key, value]) => key !== 'errors' && typeof value === 'number' && value > 0,
  );
}
