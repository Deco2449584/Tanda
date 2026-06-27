import type { Timestamp } from 'firebase/firestore';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';

export interface AdminRoleTemplateFirestore {
  name: string;
  description?: string;
  modulePermissions: AdminModulePermissionsFirestore;
  active: boolean;
  isBuiltIn?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminRoleTemplate {
  id: string;
  name: string;
  description?: string;
  modulePermissions: AdminModulePermissionsFirestore;
  active: boolean;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAdminRoleInput {
  name: string;
  description?: string;
  modulePermissions: AdminModulePermissionsFirestore;
  active?: boolean;
}

export interface UpdateAdminRoleInput {
  name?: string;
  description?: string;
  modulePermissions?: AdminModulePermissionsFirestore;
  active?: boolean;
}
