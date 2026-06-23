'use client';

import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createLocation,
  deleteLocation,
  setLocationActive,
  subscribeLocations,
  updateLocation,
} from '@/lib/locations/locations-service';
import type { Location } from '@/lib/types/location';

interface LocationsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

interface EditFormState {
  name: string;
  city: string;
  code: string;
}

const emptyEditForm: EditFormState = { name: '', city: '', code: '' };

export function LocationsTab({ onToast }: LocationsTabProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeLocations(
      (data) => {
        setLocations(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
        onToast('Could not load locations.', 'error');
      },
    );

    return () => unsubscribe();
  }, [onToast]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      await createLocation({ name, city, code: code || undefined });
      setName('');
      setCity('');
      setCode('');
      onToast('Location created.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create location.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(location: Location) {
    setEditingId(location.id);
    setEditForm({
      name: location.name,
      city: location.city,
      code: location.code ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyEditForm);
  }

  async function handleSaveEdit(locationId: string) {
    setSavingEditId(locationId);

    try {
      await updateLocation(locationId, {
        name: editForm.name,
        city: editForm.city,
        code: editForm.code || undefined,
      });
      cancelEdit();
      onToast('Location updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update location.';
      onToast(message, 'error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleToggleActive(location: Location) {
    try {
      await setLocationActive(location.id, !location.active);
      onToast(
        location.active
          ? `${location.name} deactivated.`
          : `${location.name} activated.`,
      );
    } catch {
      onToast('Could not update location status.', 'error');
    }
  }

  async function handleDelete(location: Location) {
    const confirmed = window.confirm(
      `Delete "${location.name}" permanently?\n\nThis cannot be undone. Employees must be reassigned first.`,
    );
    if (!confirmed) return;

    setDeletingId(location.id);

    try {
      await deleteLocation(location.id);
      onToast(`${location.name} deleted.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete location.';
      onToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          Branch locations
        </h2>
        <p className="mt-2 text-sm text-muted">
          Define offices or sites and assign each employee to a location. Used
          in staff management, schedule, and attendance filters.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">New location</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Location name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Sydney Warehouse"
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                City
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="Sydney"
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Code (optional)
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SYD"
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Creating…' : 'Create location'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Registered locations</h3>
        {loading ? (
          <p className="mt-4 text-sm text-subtle">Loading…</p>
        ) : locations.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No locations yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {locations.map((location) => (
              <li
                key={location.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                {editingId === location.id ? (
                  <div className="min-w-0 flex-1 space-y-3">
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="City"
                        className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                      />
                      <input
                        value={editForm.code}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="Code"
                        className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(location.id)}
                        disabled={savingEditId === location.id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingEditId === location.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="font-medium text-white">{location.name}</p>
                      <p className="text-xs text-subtle">
                        {location.city}
                        {location.code ? ` · ${location.code}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          location.active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-700 text-muted'
                        }`}
                      >
                        {location.active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(location)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(location)}
                        className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500"
                      >
                        {location.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(location)}
                        disabled={deletingId === location.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        {deletingId === location.id ? 'Deleting…' : 'Delete'}
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
