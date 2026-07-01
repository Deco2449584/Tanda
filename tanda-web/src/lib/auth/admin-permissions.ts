import {
  mapModulePermissions,
  moduleHasAnyAction,
  canPerformAction,
  buildResolvedActionsFromMapped,
} from '@/lib/auth/admin-action-permissions';
import {
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_KEYS,
  ADMIN_MODULE_ACTIONS,
  type AdminActionModule,
  type AdminActionName,
  type AdminEditModuleKey,
  type AdminModuleKey,
  type AdminModulePermissionsFirestore,
  type ResolvedAdminAccess,
  SETTINGS_SECTION_ACTIONS,
  type SettingsSectionKey,
} from '@/lib/types/admin-permissions';
import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole, isMasterRole } from '@/lib/auth/roles';

export {
  ADMIN_ACTION_LABELS,
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_ACTIONS,
  ADMIN_MODULE_KEYS,
  canPerformAction,
  moduleHasAnyAction,
  mapModulePermissions,
} from '@/lib/auth/admin-action-permissions';

export const ADMIN_MODULE_ROUTES: Record<AdminModuleKey, string> = {
  dashboard: '/dashboard',
  attendance: '/attendance',
  payroll: '/payroll',
  schedule: '/schedule',
  employees: '/employees',
  announcements: '/announcements',
  leaveRequests: '/leave-requests',
  inspections: '/inspections',
  issueReports: '/issue-reports',
  helpTutorials: '/help-tutorials',
  kiosk: '/kiosk',
  settings: '/settings',
};

const MODULE_ORDER: AdminModuleKey[] = [...ADMIN_MODULE_KEYS];

function buildFullActions(): ResolvedAdminAccess['actions'] {
  return Object.fromEntries(
    ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => [
      moduleKey,
      Object.fromEntries(
        ADMIN_MODULE_ACTIONS[moduleKey].map((action) => [action, true]),
      ),
    ]),
  ) as ResolvedAdminAccess['actions'];
}

function buildFullAccess(): ResolvedAdminAccess {
  const mapped = mapModulePermissions(null);
  return {
    isMaster: false,
    isAdminArea: true,
    modules: mapped.modules as Record<AdminModuleKey, boolean>,
    edit: mapped.edit as Record<AdminEditModuleKey, boolean>,
    actions: buildFullActions(),
  };
}

export function resolveAdminAccess(input: {
  role: UserRole;
  modulePermissions?: AdminModulePermissionsFirestore | null;
}): ResolvedAdminAccess | null {
  if (!isAdminAreaRole(input.role)) {
    return null;
  }

  if (isMasterRole(input.role)) {
    return {
      ...buildFullAccess(),
      isMaster: true,
    };
  }

  const mapped = mapModulePermissions(input.modulePermissions);

  return {
    isMaster: false,
    isAdminArea: true,
    modules: mapped.modules as Record<AdminModuleKey, boolean>,
    edit: mapped.edit as Record<AdminEditModuleKey, boolean>,
    actions: buildResolvedActionsFromMapped(mapped),
  };
}

export function getModuleKeyForPath(pathname: string): AdminModuleKey | null {
  const normalized = pathname.split('?')[0] ?? pathname;

  if (
    normalized === '/worked-shifts' ||
    normalized.startsWith('/worked-shifts/')
  ) {
    return 'attendance';
  }

  for (const key of MODULE_ORDER) {
    const href = ADMIN_MODULE_ROUTES[key];
    if (normalized === href || normalized.startsWith(`${href}/`)) {
      return key;
    }
  }

  return null;
}

export function canAccessPath(
  access: ResolvedAdminAccess | null,
  pathname: string,
): boolean {
  if (!access) return false;
  if (access.isMaster) return true;

  const moduleKey = getModuleKeyForPath(pathname);
  if (!moduleKey) return true;

  return access.modules[moduleKey] === true;
}

export function getDefaultAdminHref(access: ResolvedAdminAccess): string {
  for (const key of MODULE_ORDER) {
    if (access.modules[key]) {
      return ADMIN_MODULE_ROUTES[key];
    }
  }

  return '/dashboard';
}

export function createDefaultModulePermissions(): AdminModulePermissionsFirestore {
  return mapModulePermissions(null);
}

export function canViewSettingsSection(
  access: ResolvedAdminAccess | null,
  section: SettingsSectionKey,
): boolean {
  if (!access) return false;
  if (access.isMaster) return true;
  if (!access.modules.settings) return false;

  const action = SETTINGS_SECTION_ACTIONS[section];
  return access.actions.settings[action] === true;
}

// Re-export for consumers that import from this module
export type { AdminActionModule, AdminActionName };
