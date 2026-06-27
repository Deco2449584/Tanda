export const ADMIN_MODULE_KEYS = [
  'dashboard',
  'attendance',
  'schedule',
  'employees',
  'announcements',
  'leaveRequests',
  'inspections',
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
  'settings',
] as const;

export type AdminEditModuleKey = (typeof ADMIN_EDIT_MODULE_KEYS)[number];

export interface AdminModulePermissionsFirestore {
  modules?: Partial<Record<AdminModuleKey, boolean>>;
  edit?: Partial<Record<AdminEditModuleKey, boolean>>;
}

export interface ResolvedAdminAccess {
  isMaster: boolean;
  isAdminArea: boolean;
  modules: Record<AdminModuleKey, boolean>;
  edit: Record<AdminEditModuleKey, boolean>;
}
