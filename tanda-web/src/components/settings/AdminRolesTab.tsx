'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Shield, Trash2, X } from 'lucide-react';
import { AdminPermissionsEditor } from '@/components/employees/AdminPermissionsEditor';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import {
  createAdminRoleRequest,
  deleteAdminRoleRequest,
  fetchAdminRoles,
  updateAdminRoleRequest,
} from '@/lib/admin-roles/admin-roles-client';
import type { AdminRoleTemplate } from '@/lib/types/admin-role';

interface RoleFormState {
  name: string;
  description: string;
  active: boolean;
  modulePermissions: ReturnType<typeof mapModulePermissions>;
}

const emptyForm = (): RoleFormState => ({
  name: '',
  description: '',
  active: true,
  modulePermissions: mapModulePermissions(null),
});

export function AdminRolesTab() {
  const [roles, setRoles] = useState<AdminRoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRoleTemplate | null>(null);
  const [form, setForm] = useState<RoleFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadRoles() {
    setLoading(true);
    setError(null);

    try {
      const items = await fetchAdminRoles();
      setRoles(items);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load access roles.',
      );
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRoles();
  }, []);

  function openCreateModal() {
    setEditingRole(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEditModal(role: AdminRoleTemplate) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? '',
      active: role.active,
      modulePermissions: mapModulePermissions(role.modulePermissions),
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingRole(null);
    setForm(emptyForm());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Role name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingRole) {
        await updateAdminRoleRequest(editingRole.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          active: form.active,
          modulePermissions: form.modulePermissions,
        });
      } else {
        await createAdminRoleRequest({
          name: form.name.trim(),
          description: form.description.trim(),
          modulePermissions: form.modulePermissions,
          active: form.active,
        });
      }

      closeModal();
      await loadRoles();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not save access role.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: AdminRoleTemplate) {
    if (role.isBuiltIn) return;

    const confirmed = window.confirm(
      `Delete the "${role.name}" role? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(role.id);
    setError(null);

    try {
      await deleteAdminRoleRequest(role.id);
      await loadRoles();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete access role.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/15 p-2 text-primary">
                <Shield className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-white">Access roles</h2>
            </div>
            <p className="mt-2 text-sm text-subtle">
              Create administrator roles with module access and edit rights. Assign
              them when creating or editing staff with the Administrator sign-in type.
            </p>
            <p className="mt-2 text-xs text-muted">
              System sign-in types Master, Employee, and Kiosk are fixed and cannot
              be edited here.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New role
          </button>
        </div>
      </div>

      {error && !modalOpen ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingIndicator message="Loading access roles…" className="h-40" />
      ) : (
        <ul className="space-y-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="rounded-xl border border-border bg-surface-raised p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                    {!role.active ? (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Inactive
                      </span>
                    ) : null}
                    {role.isBuiltIn ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Built-in
                      </span>
                    ) : null}
                  </div>
                  {role.description ? (
                    <p className="mt-1 text-sm text-subtle">{role.description}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(role)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-semibold text-muted hover:bg-surface-hover hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  {!role.isBuiltIn ? (
                    <button
                      type="button"
                      disabled={deletingId === role.id}
                      onClick={() => void handleDelete(role)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/20 px-3 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close modal"
            onClick={closeModal}
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingRole ? 'Edit access role' : 'New access role'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <div>
                <label htmlFor="role-name" className="mb-1.5 block text-sm text-muted">
                  Role name
                </label>
                <input
                  id="role-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Scheduler, HR manager"
                />
              </div>

              <div>
                <label htmlFor="role-description" className="mb-1.5 block text-sm text-muted">
                  Description
                </label>
                <textarea
                  id="role-description"
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="What this role is for…"
                />
              </div>

              <AdminPermissionsEditor
                value={form.modulePermissions}
                onChange={(modulePermissions) =>
                  setForm((current) => ({ ...current, modulePermissions }))
                }
                disabled={saving}
              />

              <label className="flex items-center justify-between rounded-lg border border-border bg-surface-base/60 px-3 py-3">
                <span className="text-sm text-foreground">Active role</span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, active: event.target.checked }))
                  }
                  disabled={saving}
                  className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary"
                />
              </label>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm font-medium text-muted hover:bg-surface-hover disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingRole ? 'Save changes' : 'Create role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
