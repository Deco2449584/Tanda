import {
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_ACTIONS,
  ADMIN_MODULE_KEYS,
  type AdminActionModule,
  type AdminActionName,
  type AdminEditModuleKey,
  type AdminModuleActionsFirestore,
  type AdminModuleKey,
  type AdminModulePermissionsFirestore,
  type AdminResolvedActions,
  type ResolvedAdminAccess,
} from '@/lib/types/admin-permissions';

export const ADMIN_ACTION_LABELS: {
  [M in AdminActionModule]: Record<AdminActionName<M>, string>;
} = {
  employees: {
    create: 'Create employees',
    update: 'Edit employees',
    delete: 'Delete employees',
    invite: 'Send invite emails',
  },
  attendance: {
    create: 'Add manual records',
    update: 'Edit records',
    delete: 'Delete records',
  },
  schedule: {
    create: 'Assign shifts',
    update: 'Edit shifts',
    delete: 'Delete shifts',
  },
  leaveRequests: {
    manage: 'Approve / reject requests',
    update: 'Edit leave requests',
    delete: 'Delete leave requests',
  },
  announcements: {
    publish: 'Publish announcements',
    delete: 'Delete announcements',
  },
  issueReports: {
    manage: 'Update status and admin notes',
    update: 'Edit issue details',
    delete: 'Delete issue reports',
  },
  helpTutorials: {
    create: 'Upload tutorials',
    update: 'Edit tutorials',
    delete: 'Delete tutorials',
  },
  settings: {
    update: 'Save system settings',
    viewLocalization: 'Localization tab',
    viewAttendance: 'Time & attendance tab',
    viewNotifications: 'Notifications tab',
    viewLocations: 'Locations tab',
    viewDepartments: 'Departments tab',
    viewLocationGroups: 'Location groups tab',
    viewKioskDevices: 'Kiosk devices tab',
    viewPortal: 'Portal clients tab',
  },
};

function buildFullActions(): AdminResolvedActions {
  return Object.fromEntries(
    ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => [
      moduleKey,
      Object.fromEntries(
        ADMIN_MODULE_ACTIONS[moduleKey].map((action) => [action, true]),
      ),
    ]),
  ) as AdminResolvedActions;
}

function applyLegacyActionFallback(
  moduleKey: AdminEditModuleKey,
  moduleActions: Record<string, boolean>,
  rawModule: Partial<Record<string, boolean>>,
) {
  if (moduleKey === 'leaveRequests' || moduleKey === 'issueReports') {
    if (moduleActions.manage === true) {
      if (rawModule.update === undefined) moduleActions.update = true;
      if (rawModule.delete === undefined) moduleActions.delete = true;
    }
  }

  if (moduleKey === 'settings' && moduleActions.update === true) {
    const viewKeys = [
      'viewLocalization',
      'viewAttendance',
      'viewNotifications',
      'viewLocations',
      'viewDepartments',
      'viewLocationGroups',
      'viewKioskDevices',
      'viewPortal',
    ] as const;
    for (const key of viewKeys) {
      if (rawModule[key] === undefined) {
        moduleActions[key] = true;
      }
    }
  }
}

function resolveModuleActions(
  modules: Record<AdminModuleKey, boolean>,
  legacyEdit: Record<AdminEditModuleKey, boolean>,
  rawActions?: AdminModuleActionsFirestore,
): AdminResolvedActions {
  const resolved: Record<string, Record<string, boolean>> = {};

  for (const moduleKey of ADMIN_EDIT_MODULE_KEYS) {
    const actionNames = ADMIN_MODULE_ACTIONS[moduleKey];
    const moduleEnabled = modules[moduleKey] === true;
    const legacyModuleEdit = legacyEdit[moduleKey] !== false;
    const rawModule = rawActions?.[moduleKey] ?? {};

    const moduleActions: Record<string, boolean> = {};

    for (const action of actionNames) {
      const explicit = rawModule[action as keyof typeof rawModule];
      if (explicit === true || explicit === false) {
        moduleActions[action] = explicit;
      } else if (!moduleEnabled || !legacyModuleEdit) {
        moduleActions[action] = false;
      } else {
        moduleActions[action] = true;
      }
    }

    applyLegacyActionFallback(moduleKey, moduleActions, rawModule);

    resolved[moduleKey] = moduleActions;
  }

  return resolved as AdminResolvedActions;
}

function deriveLegacyEdit(
  modules: Record<AdminModuleKey, boolean>,
  actions: AdminResolvedActions,
): Record<AdminEditModuleKey, boolean> {
  return Object.fromEntries(
    ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => {
      if (!modules[moduleKey]) return [moduleKey, false];
      const hasAny = ADMIN_MODULE_ACTIONS[moduleKey].some(
        (action) =>
          (actions[moduleKey] as Record<string, boolean>)[action] === true,
      );
      return [moduleKey, hasAny];
    }),
  ) as Record<AdminEditModuleKey, boolean>;
}

function serializeActions(
  actions: AdminResolvedActions,
): AdminModuleActionsFirestore {
  const payload: AdminModuleActionsFirestore = {};

  for (const moduleKey of ADMIN_EDIT_MODULE_KEYS) {
    const moduleActions: Record<string, boolean> = {};
    for (const action of ADMIN_MODULE_ACTIONS[moduleKey]) {
      moduleActions[action] =
        (actions[moduleKey] as Record<string, boolean>)[action] === true;
    }
    payload[moduleKey] = moduleActions as AdminModuleActionsFirestore[typeof moduleKey];
  }

  return payload;
}

export function buildResolvedActionsFromMapped(
  mapped: AdminModulePermissionsFirestore,
): AdminResolvedActions {
  const modules = mapped.modules as Record<AdminModuleKey, boolean>;

  return Object.fromEntries(
    ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => [
      moduleKey,
      Object.fromEntries(
        ADMIN_MODULE_ACTIONS[moduleKey].map((action) => [
          action,
          modules[moduleKey] === true &&
            mapped.actions?.[moduleKey]?.[action as keyof (typeof mapped.actions)[typeof moduleKey]] ===
              true,
        ]),
      ),
    ]),
  ) as AdminResolvedActions;
}

export function mapModulePermissions(
  raw: AdminModulePermissionsFirestore | null | undefined,
): AdminModulePermissionsFirestore {
  const modules = Object.fromEntries(
    ADMIN_MODULE_KEYS.map((key) => [key, raw?.modules?.[key] !== false]),
  ) as Record<AdminModuleKey, boolean>;

  const legacyEdit = Object.fromEntries(
    ADMIN_EDIT_MODULE_KEYS.map((key) => [key, raw?.edit?.[key] !== false]),
  ) as Record<AdminEditModuleKey, boolean>;

  const actions = resolveModuleActions(modules, legacyEdit, raw?.actions);
  const edit = deriveLegacyEdit(modules, actions);

  return {
    modules,
    edit,
    actions: serializeActions(actions),
  };
}

export function canPerformAction<M extends AdminActionModule>(
  access: ResolvedAdminAccess | null,
  module: M,
  action: AdminActionName<M>,
): boolean {
  if (!access) return false;
  if (access.isMaster) return true;
  if (!access.modules[module]) return false;
  return (
    (access.actions[module] as Record<AdminActionName<M>, boolean>)[action] ===
    true
  );
}

export function moduleHasAnyAction(
  access: ResolvedAdminAccess | null,
  module: AdminActionModule,
): boolean {
  if (!access) return false;
  if (access.isMaster) return true;
  if (!access.modules[module]) return false;
  return ADMIN_MODULE_ACTIONS[module].some(
    (action) =>
      (access.actions[module] as Record<string, boolean>)[action] === true,
  );
}

export {
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_ACTIONS,
  ADMIN_MODULE_KEYS,
  serializeActions,
};
