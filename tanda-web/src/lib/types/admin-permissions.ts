export const ADMIN_MODULE_KEYS = [
  'dashboard',
  'attendance',
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
  schedule: ['create', 'update', 'delete'] as const,
  leaveRequests: ['manage'] as const,
  announcements: ['publish', 'delete'] as const,
  issueReports: ['manage'] as const,
  helpTutorials: ['create', 'update', 'delete'] as const,
  settings: ['update'] as const,
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
