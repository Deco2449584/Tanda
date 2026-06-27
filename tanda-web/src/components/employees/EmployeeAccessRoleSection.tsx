'use client';

import { AdminPermissionsEditor } from '@/components/employees/AdminPermissionsEditor';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';
import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';

export function isKioskAccessRole(role: EmployeeAccessRole): boolean {
  return role === 'kiosk';
}

interface EmployeeAccessRoleSectionProps {
  accessRole: EmployeeAccessRole;
  modulePermissions: AdminModulePermissionsFirestore;
  onAccessRoleChange: (role: EmployeeAccessRole) => void;
  onModulePermissionsChange: (value: AdminModulePermissionsFirestore) => void;
  disabled?: boolean;
  showPermissions?: boolean;
}

export function EmployeeAccessRoleSection({
  accessRole,
  modulePermissions,
  onAccessRoleChange,
  onModulePermissionsChange,
  disabled = false,
  showPermissions = true,
}: EmployeeAccessRoleSectionProps) {
  if (!showPermissions) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-base/60 px-3 py-3">
      <div>
        <label htmlFor="emp-access-role" className="mb-1.5 block text-sm text-muted">
          Access role
        </label>
        <select
          id="emp-access-role"
          value={accessRole}
          onChange={(event) =>
            onAccessRoleChange(event.target.value as EmployeeAccessRole)
          }
          disabled={disabled}
          className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        >
          <option value="empleado">Employee</option>
          <option value="admin">Administrator</option>
          <option value="master">Master</option>
          <option value="kiosk">Kiosk device</option>
        </select>
        <p className="mt-1.5 text-xs text-subtle">
          Controls sign-in area and permissions. Kiosk accounts only use the check-in
          module.
        </p>
      </div>

      {accessRole === 'admin' ? (
        <AdminPermissionsEditor
          value={modulePermissions}
          onChange={onModulePermissionsChange}
          disabled={disabled}
        />
      ) : null}

      {isKioskAccessRole(accessRole) ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-subtle">
          Kiosk accounts only need identity and sign-in details. Scheduling, payroll,
          and personal file sections are hidden.
        </p>
      ) : null}
    </div>
  );
}

export function createDefaultModulePermissions(): AdminModulePermissionsFirestore {
  return mapModulePermissions(null);
}
