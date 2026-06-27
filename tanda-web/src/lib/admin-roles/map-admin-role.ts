import type { AdminRoleTemplate } from '@/lib/types/admin-role';

export function mapAdminRoleDoc(
  id: string,
  data: Record<string, unknown>,
): AdminRoleTemplate {
  const modulePermissions =
    data.modulePermissions && typeof data.modulePermissions === 'object'
      ? (data.modulePermissions as AdminRoleTemplate['modulePermissions'])
      : {};

  return {
    id,
    name: typeof data.name === 'string' ? data.name.trim() : 'Unnamed role',
    description:
      typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : undefined,
    modulePermissions,
    active: data.active !== false,
    isBuiltIn: data.isBuiltIn === true,
    createdAt:
      typeof data.createdAt === 'object' &&
      data.createdAt !== null &&
      'toMillis' in data.createdAt &&
      typeof (data.createdAt as { toMillis: () => number }).toMillis === 'function'
        ? (data.createdAt as { toMillis: () => number }).toMillis()
        : typeof data.createdAt === 'number'
          ? data.createdAt
          : 0,
    updatedAt:
      typeof data.updatedAt === 'object' &&
      data.updatedAt !== null &&
      'toMillis' in data.updatedAt &&
      typeof (data.updatedAt as { toMillis: () => number }).toMillis === 'function'
        ? (data.updatedAt as { toMillis: () => number }).toMillis()
        : typeof data.updatedAt === 'number'
          ? data.updatedAt
          : 0,
  };
}
