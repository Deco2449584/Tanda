import { auth } from '@/lib/firebase';
import type {
  AdminRoleTemplate,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
} from '@/lib/types/admin-role';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchAdminRoles(): Promise<AdminRoleTemplate[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin-roles', { headers });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not load access roles.');
  }

  const data = (await response.json()) as { roles: AdminRoleTemplate[] };
  return data.roles;
}

export async function createAdminRoleRequest(
  input: CreateAdminRoleInput,
): Promise<AdminRoleTemplate> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/admin-roles', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not create access role.');
  }

  const data = (await response.json()) as { role: AdminRoleTemplate };
  return data.role;
}

export async function updateAdminRoleRequest(
  roleId: string,
  input: UpdateAdminRoleInput,
): Promise<AdminRoleTemplate> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin-roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update access role.');
  }

  const data = (await response.json()) as { role: AdminRoleTemplate };
  return data.role;
}

export async function deleteAdminRoleRequest(roleId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/admin-roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not delete access role.');
  }
}
