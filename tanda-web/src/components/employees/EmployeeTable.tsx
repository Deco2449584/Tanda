'use client';

import { useMemo, useState } from 'react';
import { Pencil, UserRoundX, UserCheck } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { PersonalProfileStatusBadge } from '@/components/employees/PersonalProfileStatusBadge';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { getEmployeeLocationLabel } from '@/lib/location-groups/format-location-group';
import { canEditStaffAccount, isMasterEmployee } from '@/lib/employees/is-protected-admin';
import { requestSyncEmployeeAuth } from '@/lib/employees/request-sync-employee-auth';
import { requestUpdateEmployee } from '@/lib/employees/request-update-employee';
import { recordEmployeeAuditEvent } from '@/lib/audit/audit-logs-client';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { Employee } from '@/lib/types/employee';

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  onEdit?: (employee: Employee) => void;
  canUpdate?: boolean;
}

function StatusBadge({
  active,
  compact = false,
}: {
  active: boolean;
  compact?: boolean;
}) {
  const sizeClass = compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  if (active) {
    return (
      <span
        className={`inline-flex shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-300 ${sizeClass}`}
      >
        Active
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border border-red-500/30 bg-red-500/10 font-semibold text-red-400 ${sizeClass}`}
    >
      Inactive
    </span>
  );
}

export function EmployeeTable({
  employees,
  loading,
  searchQuery,
  onEdit,
  canUpdate = false,
}: EmployeeTableProps) {
  const { groups } = useLocationGroups();
  const { locations } = useLocations();
  const { refresh: refreshEmployees } = useEmployees();
  const { isMaster } = useAdminAccess();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) => {
      const employeeCode = employee.employeeId.toLowerCase();
      const locationLabel = getEmployeeLocationLabel(employee, locations, groups).toLowerCase();
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query) ||
        locationLabel.includes(query) ||
        employeeCode.includes(query)
      );
    });
  }, [employees, groups, locations, searchQuery]);

  async function handleToggleActive(employee: Employee) {
    if (!canUpdate || !canEditStaffAccount(isMaster, employee)) return;
    if (isMasterEmployee(employee)) {
      window.alert('Master accounts cannot be deactivated.');
      return;
    }

    const nextActive = !employee.active;
    const confirmed = window.confirm(
      nextActive
        ? `Reactivate ${employee.name}? They will be able to sign in again (if they have an account).`
        : `Deactivate ${employee.name}? They will be hidden from scheduling and kiosk PIN lookup, and sign-in will be disabled. You can permanently delete them from their edit form if needed.`,
    );
    if (!confirmed) return;

    setBusyId(employee.id);
    try {
      await requestUpdateEmployee(employee.id, {
        fields: { active: nextActive },
      });
      await requestSyncEmployeeAuth(employee.id, nextActive ? 'enable' : 'disable');
      void recordEmployeeAuditEvent({
        action: 'employee.updated',
        employeeDocId: employee.id,
        summary: `${nextActive ? 'Reactivated' : 'Deactivated'} employee ${employee.name} (${employee.employeeId})`,
      });
      await refreshEmployees();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Could not update employee status. Please try again.',
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading staff…" />
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No employees match that search.'
    : 'No employees registered. Create the first one.';
  const showActions = Boolean(onEdit) || canUpdate;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface-base/40 text-xs uppercase tracking-wide text-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {showActions ? <th className="px-4 py-3 font-medium">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={showActions ? 6 : 5}
                  className="px-4 py-10 text-center text-sm text-subtle"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const canEditThis = Boolean(onEdit) && canEditStaffAccount(isMaster, employee);
                const canToggleThis =
                  canUpdate &&
                  canEditStaffAccount(isMaster, employee) &&
                  !isMasterEmployee(employee);

                return (
                  <tr key={employee.id} className="align-middle">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={employee.name}
                          photoUrl={employee.photoUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{employee.name}</p>
                          <p className="truncate text-xs text-subtle">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-muted">
                      {employee.employeeId || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {employee.department || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {getEmployeeLocationLabel(employee, locations, groups)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusBadge active={employee.active} />
                        {employee.personalProfileStatus === 'Pending' ? (
                          <PersonalProfileStatusBadge status="Pending" compact />
                        ) : null}
                      </div>
                    </td>
                    {showActions ? (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {canEditThis ? (
                            <button
                              type="button"
                              onClick={() => onEdit?.(employee)}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                              aria-label={`Edit ${employee.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canUpdate ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleActive(employee)}
                              disabled={busyId === employee.id || !canToggleThis}
                              title={
                                isMasterEmployee(employee)
                                  ? 'Master accounts cannot be deactivated'
                                  : !canToggleThis
                                    ? 'You cannot change this account'
                                    : employee.active
                                      ? `Deactivate ${employee.name}`
                                      : `Reactivate ${employee.name}`
                              }
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={
                                employee.active
                                  ? `Deactivate ${employee.name}`
                                  : `Reactivate ${employee.name}`
                              }
                            >
                              {employee.active ? (
                                <UserRoundX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/80 md:hidden">
        {filteredEmployees.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-subtle">{emptyMessage}</li>
        ) : (
          filteredEmployees.map((employee) => {
            const canEditThis = Boolean(onEdit) && canEditStaffAccount(isMaster, employee);
            const canToggleThis =
              canUpdate &&
              canEditStaffAccount(isMaster, employee) &&
              !isMasterEmployee(employee);
            const locationLabel = getEmployeeLocationLabel(employee, locations, groups);
            const metaParts = [
              employee.employeeId || null,
              employee.department || null,
              locationLabel !== '—' ? locationLabel : null,
            ].filter(Boolean);

            return (
              <li key={employee.id}>
                <article className="flex items-center gap-3 px-4 py-3">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employee.photoUrl}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {metaParts.join(' · ')}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-subtle">
                      {employee.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge active={employee.active} compact />
                    {employee.personalProfileStatus === 'Pending' ? (
                      <PersonalProfileStatusBadge status="Pending" compact />
                    ) : null}

                    {showActions ? (
                      <div className="flex items-center gap-0.5">
                        {canEditThis ? (
                          <button
                            type="button"
                            onClick={() => onEdit?.(employee)}
                            className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-primary"
                            aria-label={`Edit ${employee.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canUpdate ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(employee)}
                            disabled={busyId === employee.id || !canToggleThis}
                            title={
                              employee.active
                                ? `Deactivate ${employee.name}`
                                : `Reactivate ${employee.name}`
                            }
                            className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={
                              employee.active
                                ? `Deactivate ${employee.name}`
                                : `Reactivate ${employee.name}`
                            }
                          >
                            {employee.active ? (
                              <UserRoundX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
