'use client';

import {
  ADMIN_ACTION_LABELS,
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_ACTIONS,
  ADMIN_MODULE_KEYS,
  mapModulePermissions,
} from '@/lib/auth/admin-permissions';
import type {
  AdminActionModule,
  AdminActionName,
  AdminEditModuleKey,
  AdminModuleKey,
  AdminModulePermissionsFirestore,
} from '@/lib/types/admin-permissions';

const MODULE_LABELS: Record<AdminModuleKey, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance',
  schedule: 'Schedule',
  employees: 'Employees',
  announcements: 'Announcements',
  leaveRequests: 'Leave requests',
  inspections: 'Inspections',
  issueReports: 'Issue reports',
  helpTutorials: 'Help tutorials',
  kiosk: 'Kiosk check-in',
  settings: 'Settings',
};

interface AdminPermissionsEditorProps {
  value: AdminModulePermissionsFirestore;
  onChange: (value: AdminModulePermissionsFirestore) => void;
  disabled?: boolean;
}

export function AdminPermissionsEditor({
  value,
  onChange,
  disabled = false,
}: AdminPermissionsEditorProps) {
  const mapped = mapModulePermissions(value);
  const modules = mapped.modules ?? {};
  const actions = mapped.actions ?? {};

  function commit(next: AdminModulePermissionsFirestore) {
    onChange(mapModulePermissions(next));
  }

  function toggleModule(moduleKey: AdminModuleKey, enabled: boolean) {
    commit({
      modules: { ...value.modules, [moduleKey]: enabled },
      actions: value.actions,
      edit: value.edit,
    });
  }

  function toggleAction<M extends AdminActionModule>(
    moduleKey: M,
    action: AdminActionName<M>,
    enabled: boolean,
  ) {
    const currentModule = {
      ...(value.actions?.[moduleKey] ?? {}),
    } as Partial<Record<AdminActionName<M>, boolean>>;
    currentModule[action] = enabled;

    commit({
      modules: value.modules,
      edit: value.edit,
      actions: {
        ...value.actions,
        [moduleKey]: currentModule,
      },
    });
  }

  function setAllModuleActions(moduleKey: AdminEditModuleKey, enabled: boolean) {
    const moduleActions = Object.fromEntries(
      ADMIN_MODULE_ACTIONS[moduleKey].map((action) => [action, enabled]),
    );

    commit({
      modules: value.modules,
      edit: value.edit,
      actions: {
        ...value.actions,
        [moduleKey]: moduleActions,
      },
    });
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-base/60 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Module access</p>
        <p className="mt-0.5 text-xs text-subtle">
          Choose which admin sections this user can open (view).
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_MODULE_KEYS.map((moduleKey) => (
          <label
            key={moduleKey}
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={modules[moduleKey] !== false}
              disabled={disabled}
              onChange={(event) => toggleModule(moduleKey, event.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
            />
            {MODULE_LABELS[moduleKey]}
          </label>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Detailed permissions</p>
        <p className="mt-0.5 text-xs text-subtle">
          Control create, edit, delete and other actions separately. For example, allow
          creating employees without editing existing ones.
        </p>
      </div>

      <div className="space-y-3">
        {ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => {
          const moduleEnabled = modules[moduleKey] !== false;
          const moduleActionState =
            (actions[moduleKey] as Partial<
              Record<AdminActionName<typeof moduleKey>, boolean>
            >) ?? {};
          const allEnabled = ADMIN_MODULE_ACTIONS[moduleKey].every(
            (action) => moduleActionState[action] === true,
          );

          return (
            <div
              key={moduleKey}
              className={`rounded-lg border border-border px-3 py-3 ${
                moduleEnabled ? '' : 'opacity-50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {MODULE_LABELS[moduleKey]}
                </p>
                <button
                  type="button"
                  disabled={disabled || !moduleEnabled}
                  onClick={() => setAllModuleActions(moduleKey, !allEnabled)}
                  className="text-xs font-medium text-primary transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allEnabled ? 'Clear all' : 'Allow all'}
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ADMIN_MODULE_ACTIONS[moduleKey].map((action) => (
                  <label
                    key={action}
                    className="flex items-center gap-2 rounded-md border border-border/80 px-2.5 py-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={moduleActionState[action] === true}
                      disabled={disabled || !moduleEnabled}
                      onChange={(event) =>
                        toggleAction(moduleKey, action, event.target.checked)
                      }
                      className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary disabled:opacity-50"
                    />
                    {(ADMIN_ACTION_LABELS[moduleKey] as Record<string, string>)[action]}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
