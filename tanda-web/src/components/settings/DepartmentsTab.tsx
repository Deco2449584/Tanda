'use client';

import { useState } from 'react';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  createDepartment,
  deleteDepartment,
  setDepartmentActive,
  updateDepartment,
} from '@/lib/departments/departments-service';
import type { Department } from '@/lib/types/department';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useDepartments } from '@/providers/DepartmentsProvider';

interface DepartmentsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function DepartmentsTab({ onToast }: DepartmentsTabProps) {
  const { settings, saveSettings, saving: savingSettings } = useCompanySettings();
  const { departments, loading, refresh } = useDepartments();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeDepartments = departments.filter((department) => department.active);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      await createDepartment({ name });
      setName('');
      void refresh();
      onToast('Department created.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create department.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDefault(departmentName: string) {
    try {
      await saveSettings({
        ...settings,
        defaultDepartmentName: departmentName || undefined,
      });
      onToast(
        departmentName
          ? `Default department set to "${departmentName}".`
          : 'Default department cleared.',
      );
    } catch {
      onToast('Could not save default department.', 'error');
    }
  }

  async function handleSaveEdit(departmentId: string) {
    setSavingEditId(departmentId);

    try {
      await updateDepartment(departmentId, { name: editName });
      setEditingId(null);
      setEditName('');
      void refresh();
      onToast('Department updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update department.';
      onToast(message, 'error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleToggleActive(department: Department) {
    try {
      await setDepartmentActive(department.id, !department.active);
      void refresh();
      onToast(
        department.active
          ? `${department.name} deactivated.`
          : `${department.name} activated.`,
      );
    } catch {
      onToast('Could not update department status.', 'error');
    }
  }

  async function handleDelete(department: Department) {
    const confirmed = window.confirm(
      `Delete "${department.name}" permanently?\n\nEmployees must be reassigned first.`,
    );
    if (!confirmed) return;

    setDeletingId(department.id);

    try {
      await deleteDepartment(department.id);
      if (settings.defaultDepartmentName === department.name) {
        await saveSettings({ ...settings, defaultDepartmentName: undefined });
      }
      void refresh();
      onToast(`${department.name} deleted.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete department.';
      onToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Briefcase className="h-4 w-4 text-primary" aria-hidden />
          Departments
        </h2>
        <p className="mt-2 text-sm text-muted">
          Create departments for employees and shifts. New employees can pick from
          this list instead of typing free text.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Default for new employees</h3>
        <p className="mt-1 text-xs text-subtle">
          Optional pre-selection when creating a staff member. They can still change
          or leave it empty.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={settings.defaultDepartmentName ?? ''}
            onChange={(event) => void handleSaveDefault(event.target.value)}
            disabled={savingSettings || loading}
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 sm:max-w-xs"
          >
            <option value="">No default</option>
            {activeDepartments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">New department</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Logistics"
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Registered departments</h3>
        {loading ? (
          <LoadingIndicator />
        ) : departments.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No departments yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {departments.map((department) => (
              <li
                key={department.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                {editingId === department.id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(department.id)}
                        disabled={savingEditId === department.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingEditId === department.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditName('');
                        }}
                        className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{department.name}</p>
                      <p className="text-xs text-subtle">
                        {department.active ? 'Active' : 'Inactive'}
                        {settings.defaultDepartmentName === department.name
                          ? ' · Default for new employees'
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(department.id);
                          setEditName(department.name);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(department)}
                        className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                      >
                        {department.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(department)}
                        disabled={deletingId === department.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
