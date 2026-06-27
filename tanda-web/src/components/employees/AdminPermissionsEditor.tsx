'use client';

import {
  ADMIN_EDIT_MODULE_KEYS,
  ADMIN_MODULE_KEYS,
  type AdminEditModuleKey,
  type AdminModuleKey,
  type AdminModulePermissionsFirestore,
} from '@/lib/types/admin-permissions';

const MODULE_LABELS: Record<AdminModuleKey, string> = {
  dashboard: 'Dashboard',
  attendance: 'Attendance',
  schedule: 'Schedule',
  employees: 'Employees',
  announcements: 'Announcements',
  leaveRequests: 'Leave requests',
  inspections: 'Inspections',
  kiosk: 'Kiosk check-in',
  settings: 'Settings',
};

const EDIT_LABELS: Record<AdminEditModuleKey, string> = {
  attendance: 'Edit attendance records',
  schedule: 'Edit schedules',
  employees: 'Edit employees',
  leaveRequests: 'Manage leave requests',
  announcements: 'Publish announcements',
  settings: 'Change system settings',
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
  const modules = value.modules ?? {};
  const edit = value.edit ?? {};

  function toggleModule(moduleKey: AdminModuleKey, enabled: boolean) {
    const nextModules = { ...modules, [moduleKey]: enabled };
    const nextEdit = { ...edit };

    if (!enabled && moduleKey in nextEdit) {
      nextEdit[moduleKey as AdminEditModuleKey] = false;
    }

    onChange({ modules: nextModules, edit: nextEdit });
  }

  function toggleEdit(moduleKey: AdminEditModuleKey, enabled: boolean) {
    onChange({
      modules: { ...modules, [moduleKey]: enabled ? true : modules[moduleKey] },
      edit: { ...edit, [moduleKey]: enabled },
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-base/60 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Module access</p>
        <p className="mt-0.5 text-xs text-subtle">
          Choose which admin sections this user can open.
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
        <p className="text-sm font-medium text-foreground">Edit permissions</p>
        <p className="mt-0.5 text-xs text-subtle">
          View-only modules stay read-only when edit is unchecked.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ADMIN_EDIT_MODULE_KEYS.map((moduleKey) => (
          <label
            key={moduleKey}
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm text-foreground"
          >
            <input
              type="checkbox"
              checked={edit[moduleKey] !== false}
              disabled={disabled || modules[moduleKey] === false}
              onChange={(event) => toggleEdit(moduleKey, event.target.checked)}
              className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary disabled:opacity-50"
            />
            {EDIT_LABELS[moduleKey]}
          </label>
        ))}
      </div>
    </div>
  );
}
