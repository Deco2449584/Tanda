export const ADMIN_MODULE_KEYS = [
  'dashboard',
  'attendance',
  'payroll',
  'schedule',
  'employees',
  'announcements',
  'leaveRequests',
  'inspections',
  'issueReports',
  'helpTutorials',
  'kiosk',
  'settings',
] as const;

export type AdminModuleKey = (typeof ADMIN_MODULE_KEYS)[number];

export const ADMIN_EDIT_MODULE_KEYS = [
  'attendance',
  'payroll',
  'schedule',
  'employees',
  'leaveRequests',
  'announcements',
  'issueReports',
  'helpTutorials',
  'settings',
] as const;

export type AdminEditModuleKey = (typeof ADMIN_EDIT_MODULE_KEYS)[number];

/** Granular write permissions per module (stored in Firestore). */
export const ADMIN_MODULE_ACTIONS = {
  employees: ['create', 'update', 'delete', 'invite'] as const,
  attendance: ['create', 'update', 'delete'] as const,
  payroll: ['export'] as const,
  schedule: ['create', 'update', 'delete'] as const,
  leaveRequests: ['manage', 'update', 'delete'] as const,
  announcements: ['publish', 'update', 'delete'] as const,
  issueReports: ['manage', 'update', 'delete'] as const,
  helpTutorials: ['create', 'update', 'delete'] as const,
  settings: [
    'update',
    'viewLocalization',
    'viewAttendance',
    'viewNotifications',
    'viewLocations',
    'viewDepartments',
    'viewLocationGroups',
    'viewKioskDevices',
    'viewPortal',
  ] as const,
} as const;

export type AdminActionModule = keyof typeof ADMIN_MODULE_ACTIONS;

export type AdminActionName<M extends AdminActionModule = AdminActionModule> =
  (typeof ADMIN_MODULE_ACTIONS)[M][number];

export type AdminModuleActionsFirestore = {
  [M in AdminActionModule]?: Partial<Record<AdminActionName<M>, boolean>>;
};

export type AdminResolvedActions = {
  [M in AdminActionModule]: Record<AdminActionName<M>, boolean>;
};

export interface AdminModulePermissionsFirestore {
  modules?: Partial<Record<AdminModuleKey, boolean>>;
  /** Legacy coarse edit flag — derived from `actions` when saving; used as fallback when `actions` is absent. */
  edit?: Partial<Record<AdminEditModuleKey, boolean>>;
  actions?: AdminModuleActionsFirestore;
}

export interface ResolvedAdminAccess {
  isMaster: boolean;
  isAdminArea: boolean;
  modules: Record<AdminModuleKey, boolean>;
  edit: Record<AdminEditModuleKey, boolean>;
  actions: AdminResolvedActions;
}

/** Settings tabs gated by granular `settings` view actions (master-only tabs excluded). */
export const SETTINGS_SECTION_ACTIONS = {
  localization: 'viewLocalization',
  attendance: 'viewAttendance',
  notifications: 'viewNotifications',
  locations: 'viewLocations',
  departments: 'viewDepartments',
  locationGroups: 'viewLocationGroups',
  kioskDevices: 'viewKioskDevices',
  portal: 'viewPortal',
} as const;

export type SettingsSectionKey = keyof typeof SETTINGS_SECTION_ACTIONS;
