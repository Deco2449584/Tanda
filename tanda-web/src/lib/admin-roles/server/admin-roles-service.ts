import { FieldValue } from 'firebase-admin/firestore';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import { mapAdminRoleDoc } from '@/lib/admin-roles/map-admin-role';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  AdminRoleTemplate,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
} from '@/lib/types/admin-role';

const DEFAULT_ROLE_NAME = 'Full administrator';
const DEFAULT_ROLE_DESCRIPTION =
  'Access to all admin modules with full edit rights.';

function rolesCollection() {
  return getAdminFirestore().collection(COLLECTIONS.ADMIN_ROLES);
}

export async function ensureDefaultAdminRole(): Promise<AdminRoleTemplate> {
  const snapshot = await rolesCollection().get();

  if (!snapshot.empty) {
    const sorted = snapshot.docs
      .map((doc) => mapAdminRoleDoc(doc.id, doc.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
    return sorted[0]!;
  }

  const ref = rolesCollection().doc();
  const permissions = mapModulePermissions(null);

  await ref.set({
    name: DEFAULT_ROLE_NAME,
    description: DEFAULT_ROLE_DESCRIPTION,
    modulePermissions: permissions,
    active: true,
    isBuiltIn: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  return mapAdminRoleDoc(created.id, created.data() ?? {});
}

export async function listAdminRoles(): Promise<AdminRoleTemplate[]> {
  await ensureDefaultAdminRole();

  const snapshot = await rolesCollection().get();
  return snapshot.docs
    .map((doc) => mapAdminRoleDoc(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAdminRoleById(
  roleId: string,
): Promise<AdminRoleTemplate | null> {
  const snapshot = await rolesCollection().doc(roleId.trim()).get();
  if (!snapshot.exists) return null;
  return mapAdminRoleDoc(snapshot.id, snapshot.data() ?? {});
}

export async function createAdminRole(
  input: CreateAdminRoleInput,
): Promise<AdminRoleTemplate> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Role name is required.');
  }

  const duplicate = await rolesCollection().where('name', '==', name).limit(1).get();
  if (!duplicate.empty) {
    throw new Error('A role with this name already exists.');
  }

  const ref = rolesCollection().doc();
  const payload: Record<string, unknown> = {
    name,
    modulePermissions: mapModulePermissions(input.modulePermissions),
    active: input.active !== false,
    isBuiltIn: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.description?.trim()) {
    payload.description = input.description.trim();
  }

  await ref.set(payload);
  const created = await ref.get();
  return mapAdminRoleDoc(created.id, created.data() ?? {});
}

export async function updateAdminRole(
  roleId: string,
  input: UpdateAdminRoleInput,
): Promise<AdminRoleTemplate> {
  const ref = rolesCollection().doc(roleId.trim());
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error('Role not found.');
  }

  const current = snapshot.data() ?? {};
  const nextName =
    input.name !== undefined ? input.name.trim() : (current.name as string);

  if (!nextName) {
    throw new Error('Role name is required.');
  }

  if (input.name !== undefined && nextName !== current.name) {
    const duplicate = await rolesCollection()
      .where('name', '==', nextName)
      .limit(1)
      .get();

    if (!duplicate.empty && duplicate.docs[0].id !== roleId) {
      throw new Error('A role with this name already exists.');
    }
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.name !== undefined) {
    update.name = nextName;
  }

  if (input.description !== undefined) {
    update.description = input.description.trim() || FieldValue.delete();
  }

  if (input.modulePermissions !== undefined) {
    update.modulePermissions = mapModulePermissions(input.modulePermissions);
  }

  if (input.active !== undefined) {
    update.active = input.active;
  }

  await ref.update(update);
  const updated = await ref.get();
  return mapAdminRoleDoc(updated.id, updated.data() ?? {});
}

export async function countEmployeesWithAdminRole(adminRoleId: string): Promise<number> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('adminRoleId', '==', adminRoleId.trim())
    .get();

  return snapshot.size;
}

export async function deleteAdminRole(roleId: string): Promise<void> {
  const id = roleId.trim();
  const snapshot = await rolesCollection().doc(id).get();

  if (!snapshot.exists) {
    throw new Error('Role not found.');
  }

  if (snapshot.data()?.isBuiltIn === true) {
    throw new Error('Built-in roles cannot be deleted.');
  }

  const usageCount = await countEmployeesWithAdminRole(id);
  if (usageCount > 0) {
    throw new Error(
      `This role is assigned to ${usageCount} employee${usageCount === 1 ? '' : 's'}. Reassign them before deleting.`,
    );
  }

  await rolesCollection().doc(id).delete();
}

export async function getAdminRolePermissions(
  adminRoleId: string | null | undefined,
): Promise<AdminRoleTemplate['modulePermissions'] | null> {
  if (!adminRoleId?.trim()) return null;

  const role = await getAdminRoleById(adminRoleId);
  if (!role || !role.active) return null;

  return mapModulePermissions(role.modulePermissions);
}
