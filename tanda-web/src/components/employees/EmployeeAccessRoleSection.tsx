'use client';

import Link from 'next/link';
import { useAdminRoleTemplates } from '@/hooks/useAdminRoleTemplates';
import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';

export function isKioskAccessRole(role: EmployeeAccessRole): boolean {
  return role === 'kiosk';
}

interface EmployeeAccessRoleSectionProps {
  accessRole: EmployeeAccessRole;
  adminRoleId: string;
  onAccessRoleChange: (role: EmployeeAccessRole) => void;
  onAdminRoleIdChange: (roleId: string) => void;
  disabled?: boolean;
  showPermissions?: boolean;
}

export function EmployeeAccessRoleSection({
  accessRole,
  adminRoleId,
  onAccessRoleChange,
  onAdminRoleIdChange,
  disabled = false,
  showPermissions = true,
}: EmployeeAccessRoleSectionProps) {
  const { roles, loading, error } = useAdminRoleTemplates(
    showPermissions && accessRole === 'admin',
  );

  if (!showPermissions) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-base/60 px-3 py-3">
      <div>
        <label htmlFor="emp-access-role" className="mb-1.5 block text-sm text-muted">
          Sign-in type
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
          Master has full access. Administrators use a role template from Settings.
        </p>
      </div>

      {accessRole === 'admin' ? (
        <div>
          <label htmlFor="emp-admin-role-id" className="mb-1.5 block text-sm text-muted">
            Access role template
          </label>
          <select
            id="emp-admin-role-id"
            required
            value={adminRoleId}
            onChange={(event) => onAdminRoleIdChange(event.target.value)}
            disabled={disabled || loading}
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          >
            <option value="">
              {loading ? 'Loading roles…' : 'Select a role…'}
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {error ? (
            <p className="mt-1.5 text-xs text-red-400" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-subtle">
              Manage templates in{' '}
              <Link href="/settings?tab=accessRoles" className="text-primary hover:underline">
                Settings → Access roles
              </Link>
              .
            </p>
          )}
        </div>
      ) : null}

      {isKioskAccessRole(accessRole) ? (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-subtle">
          Set a sign-in email and password for the tablet. Employees clock in with their
          own PIN — this account only opens the kiosk app.
        </p>
      ) : null}
    </div>
  );
}
