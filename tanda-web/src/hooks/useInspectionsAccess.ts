'use client';

import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { isAdminAreaRole } from '@/lib/auth/roles';

export interface InspectionsAccess {
  loading: boolean;
  /** Can open list/detail and export CSV. */
  canRead: boolean;
  /** Can open /inspections/new and register cargo. */
  canCreate: boolean;
  /** Can edit, mark loaded, and manage portal access. */
  canUpdate: boolean;
}

/**
 * Resolves Inspections permissions for admins (module actions) and for
 * workforce employees with `webInspectionsEnabled`.
 */
export function useInspectionsAccess(): InspectionsAccess {
  const { user, role } = useAuthRole();
  const { loading: adminLoading, canPerformAction } = useAdminAccess();
  const isEmployee = role === 'empleado';
  const { employee, loading: employeeLoading } = useCurrentEmployee(
    isEmployee ? user?.email : null,
  );

  if (role && isAdminAreaRole(role)) {
    return {
      loading: adminLoading,
      canRead: canPerformAction('inspections', 'read'),
      canCreate: canPerformAction('inspections', 'create'),
      canUpdate: canPerformAction('inspections', 'update'),
    };
  }

  const webEnabled = employee?.webInspectionsEnabled === true;
  const inspectAdmin = employee?.continentalInspectAdmin === true;

  return {
    loading: isEmployee ? employeeLoading : false,
    canRead: webEnabled,
    canCreate: webEnabled,
    canUpdate: webEnabled && inspectAdmin,
  };
}
