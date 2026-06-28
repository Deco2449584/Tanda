import {
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_KEYS,
  type AdminEditModuleKey,
  type AdminModuleKey,
  type AdminModulePermissionsFirestore,
  type ResolvedAdminAccess,
} from '@/lib/types/admin-permissions';
import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole, isMasterRole } from '@/lib/auth/roles';

export const ADMIN_MODULE_ROUTES: Record<AdminModuleKey, string> = {
  dashboard: '/dashboard',
  attendance: '/attendance',
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

function buildFullAccess(): ResolvedAdminAccess {
  return {
    isMaster: false,
    isAdminArea: true,
    modules: Object.fromEntries(
      ADMIN_MODULE_KEYS.map((key) => [key, true]),
    ) as Record<AdminModuleKey, boolean>,
    edit: Object.fromEntries(
      ADMIN_EDIT_MODULE_KEYS.map((key) => [key, true]),
    ) as Record<AdminEditModuleKey, boolean>,
  };
}

export function mapModulePermissions(
  raw: AdminModulePermissionsFirestore | null | undefined,
): AdminModulePermissionsFirestore {
  const modules = raw?.modules ?? {};
  const edit = raw?.edit ?? {};

  return {
    modules: Object.fromEntries(
      ADMIN_MODULE_KEYS.map((key) => [key, modules[key] !== false]),
    ) as Record<AdminModuleKey, boolean>,
    edit: Object.fromEntries(
      ADMIN_EDIT_MODULE_KEYS.map((key) => [key, edit[key] !== false]),
    ) as Record<AdminEditModuleKey, boolean>,
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
  };
}

export function getModuleKeyForPath(pathname: string): AdminModuleKey | null {
  const normalized = pathname.split('?')[0] ?? pathname;

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
