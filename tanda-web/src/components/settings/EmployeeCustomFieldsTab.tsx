'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  createEmployeeCustomFieldRequest,
  deleteEmployeeCustomFieldRequest,
  fetchEmployeeCustomFields,
  updateEmployeeCustomFieldRequest,
} from '@/lib/employees/employee-custom-fields-api';
import { employeeCustomFieldTypeLabel } from '@/lib/employees/map-employee-custom-field';
import {
  EMPLOYEE_CUSTOM_FIELD_TYPES,
  type EmployeeCustomField,
  type EmployeeCustomFieldType,
} from '@/lib/types/employee-custom-field';
import { formInputClass } from '@/components/employees/employee-form-ui';

interface EmployeeCustomFieldsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function EmployeeCustomFieldsTab({ onToast }: EmployeeCustomFieldsTabProps) {
  const [fields, setFields] = useState<EmployeeCustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EmployeeCustomFieldType>('text');
  const [required, setRequired] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [editActive, setEditActive] = useState(true);

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchEmployeeCustomFields({ includeInactive: true });
      setFields(list);
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not load custom fields.',
        'error',
      );
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    void loadFields();
  }, [loadFields]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createEmployeeCustomFieldRequest({
        title,
        description,
        type,
        required,
        active: true,
      });
      setTitle('');
      setDescription('');
      setType('text');
      setRequired(false);
      onToast('Custom field created.');
      await loadFields();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not create field.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(field: EmployeeCustomField) {
    setEditingId(field.id);
    setEditTitle(field.title);
    setEditDescription(field.description ?? '');
    setEditRequired(field.required);
    setEditActive(field.active);
  }

  async function handleSaveEdit(fieldId: string) {
    setSaving(true);
    try {
      await updateEmployeeCustomFieldRequest(fieldId, {
        title: editTitle,
        description: editDescription,
        required: editRequired,
        active: editActive,
      });
      setEditingId(null);
      onToast('Custom field updated.');
      await loadFields();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not update field.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(field: EmployeeCustomField) {
    const confirmed = window.confirm(
      `Delete "${field.title}"?\n\nExisting employee answers for this field will remain in the database but will no longer be shown.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteEmployeeCustomFieldRequest(field.id);
      onToast('Custom field deleted.');
      await loadFields();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : 'Could not delete field.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingIndicator message="Loading custom fields…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Employee custom fields</h2>
        <p className="mt-1 text-sm text-subtle">
          Define extra fields employees fill on My profile. Types: text, number, file, or
          image.
        </p>
      </div>

      <form
        onSubmit={(event) => void handleCreate(event)}
        className="space-y-4 rounded-2xl border border-border bg-surface-raised/40 p-5"
      >
        <p className="text-sm font-medium text-foreground">Add field</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={formInputClass}
              required
              disabled={saving}
              placeholder="e.g. TFN declaration"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${formInputClass} min-h-[80px]`}
              disabled={saving}
              placeholder="Shown to the employee as help text"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">Type</span>
            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value as EmployeeCustomFieldType)
              }
              className={formInputClass}
              disabled={saving}
            >
              {EMPLOYEE_CUSTOM_FIELD_TYPES.map((option) => (
                <option key={option} value={option}>
                  {employeeCustomFieldTypeLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => setRequired(event.target.checked)}
              disabled={saving}
              className="h-4 w-4 rounded border-border"
            />
            Required
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Create field
        </button>
      </form>

      <div className="space-y-3">
        {fields.length === 0 ? (
          <p className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted">
            No custom fields yet.
          </p>
        ) : (
          fields.map((field) => (
            <div
              key={field.id}
              className="rounded-2xl border border-border bg-surface-raised/30 p-4"
            >
              {editingId === field.id ? (
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    className={formInputClass}
                    disabled={saving}
                  />
                  <textarea
                    value={editDescription}
                    onChange={(event) => setEditDescription(event.target.value)}
                    className={`${formInputClass} min-h-[70px]`}
                    disabled={saving}
                  />
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editRequired}
                        onChange={(event) => setEditRequired(event.target.checked)}
                        disabled={saving}
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(event) => setEditActive(event.target.checked)}
                        disabled={saving}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveEdit(field.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{field.title}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                        {employeeCustomFieldTypeLabel(field.type)}
                      </span>
                      {field.required ? (
                        <span className="text-[10px] font-semibold text-amber-400">
                          Required
                        </span>
                      ) : null}
                      {!field.active ? (
                        <span className="text-[10px] font-semibold text-red-400">
                          Inactive
                        </span>
                      ) : null}
                    </div>
                    {field.description ? (
                      <p className="mt-1 text-xs text-subtle">{field.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(field)}
                      className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-primary"
                      aria-label={`Edit ${field.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(field)}
                      className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-red-400"
                      aria-label={`Delete ${field.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
