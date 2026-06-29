'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { mapAdminRoleDoc } from '@/lib/admin-roles/map-admin-role';
import {
  getDefaultAdminHref,
  mapModulePermissions,
  resolveAdminAccess,
  canPerformAction,
  moduleHasAnyAction,
} from '@/lib/auth/admin-permissions';
import { isAdminAreaRole } from '@/lib/auth/roles';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type {
  AdminActionModule,
  AdminActionName,
  AdminEditModuleKey,
  AdminModuleKey,
  AdminModulePermissionsFirestore,
  ResolvedAdminAccess,
} from '@/lib/types/admin-permissions';

interface AdminAccessContextValue {
  access: ResolvedAdminAccess | null;
  loading: boolean;
  isMaster: boolean;
  defaultHref: string;
  canAccessModule: (moduleKey: AdminModuleKey) => boolean;
  canEditModule: (moduleKey: AdminEditModuleKey) => boolean;
  canPerformAction: <M extends AdminActionModule>(
    module: M,
    action: AdminActionName<M>,
  ) => boolean;
}

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuthRole();
  const isAdminUser = role !== null && isAdminAreaRole(role);
  const { employee, loading: employeeLoading } = useCurrentEmployee(
    isAdminUser ? user?.email : null,
  );
  const [templatePermissions, setTemplatePermissions] =
    useState<AdminModulePermissionsFirestore | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);

  useEffect(() => {
    if (!db || role !== 'admin' || !employee?.adminRoleId?.trim()) {
      setTemplatePermissions(null);
      setTemplateLoading(false);
      return;
    }

    let cancelled = false;
    setTemplateLoading(true);

    void getDoc(doc(db, COLLECTIONS.ADMIN_ROLES, employee.adminRoleId.trim()))
      .then((snapshot) => {
        if (cancelled) return;

        if (!snapshot.exists()) {
          setTemplatePermissions(null);
          return;
        }

        const mapped = mapAdminRoleDoc(snapshot.id, snapshot.data());
        setTemplatePermissions(
          mapped.active ? mapModulePermissions(mapped.modulePermissions) : null,
        );
      })
      .catch((error) => {
        console.error('AdminAccessProvider role template', error);
        if (!cancelled) setTemplatePermissions(null);
      })
      .finally(() => {
        if (!cancelled) setTemplateLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee?.adminRoleId, role]);

  const access = useMemo(() => {
    if (!role || !isAdminAreaRole(role)) {
      return null;
    }

    const modulePermissions =
      templatePermissions ?? employee?.modulePermissions ?? null;

    return resolveAdminAccess({
      role,
      modulePermissions,
    });
  }, [role, templatePermissions, employee?.modulePermissions]);

  const value = useMemo<AdminAccessContextValue>(() => {
    const canAccessModule = (moduleKey: AdminModuleKey) =>
      access?.isMaster === true || access?.modules[moduleKey] === true;

    const canEditModule = (moduleKey: AdminEditModuleKey) =>
      moduleHasAnyAction(access, moduleKey);

    const canPerformActionForUser = <M extends AdminActionModule>(
      module: M,
      action: AdminActionName<M>,
    ) => canPerformAction(access, module, action);

    return {
      access,
      loading: isAdminUser && (employeeLoading || templateLoading),
      isMaster: access?.isMaster === true,
      defaultHref: access ? getDefaultAdminHref(access) : '/dashboard',
      canAccessModule,
      canEditModule,
      canPerformAction: canPerformActionForUser,
    };
  }, [access, employeeLoading, isAdminUser, templateLoading]);

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
