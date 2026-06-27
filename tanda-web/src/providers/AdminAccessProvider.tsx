'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import {
  getDefaultAdminHref,
  resolveAdminAccess,
} from '@/lib/auth/admin-permissions';
import { isAdminAreaRole } from '@/lib/auth/roles';
import type {
  AdminEditModuleKey,
  AdminModuleKey,
  ResolvedAdminAccess,
} from '@/lib/types/admin-permissions';

interface AdminAccessContextValue {
  access: ResolvedAdminAccess | null;
  loading: boolean;
  isMaster: boolean;
  defaultHref: string;
  canAccessModule: (moduleKey: AdminModuleKey) => boolean;
  canEditModule: (moduleKey: AdminEditModuleKey) => boolean;
}

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuthRole();
  const isAdminUser = role !== null && isAdminAreaRole(role);
  const { employee, loading: employeeLoading } = useCurrentEmployee(
    isAdminUser ? user?.email : null,
  );

  const access = useMemo(() => {
    if (!role || !isAdminAreaRole(role)) {
      return null;
    }

    return resolveAdminAccess({
      role,
      modulePermissions: employee?.modulePermissions,
    });
  }, [role, employee?.modulePermissions]);

  const value = useMemo<AdminAccessContextValue>(() => {
    const canAccessModule = (moduleKey: AdminModuleKey) =>
      access?.isMaster === true || access?.modules[moduleKey] === true;

    const canEditModule = (moduleKey: AdminEditModuleKey) =>
      access?.isMaster === true || access?.edit[moduleKey] === true;

    return {
      access,
      loading: isAdminUser && employeeLoading,
      isMaster: access?.isMaster === true,
      defaultHref: access ? getDefaultAdminHref(access) : '/dashboard',
      canAccessModule,
      canEditModule,
    };
  }, [access, employeeLoading, isAdminUser]);

  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
}

export function useAdminAccess(): AdminAccessContextValue {
  const context = useContext(AdminAccessContext);
  if (!context) {
    throw new Error('useAdminAccess must be used within AdminAccessProvider');
  }
  return context;
}
