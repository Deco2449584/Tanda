'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  createLocation,
  deleteLocation,
  regenerateLocationPin,
  setLocationActive,
  updateLocation,
} from '@/lib/locations/locations-service';
import {
  generateUniquePortalPinFromList,
  isPortalPinTaken,
  validatePortalPinFormat,
} from '@/lib/portal/pin';
import type { Location } from '@/lib/types/location';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useLocations } from '@/providers/LocationsProvider';

interface LocationsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

interface EditFormState {
  name: string;
  city: string;
  code: string;
}

const emptyEditForm: EditFormState = { name: '', city: '', code: '' };

function PinCopyButton({
  pin,
  onCopied,
  label = 'Copy PIN',
}: {
  pin: string;
  onCopied: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(pin);
        onCopied();
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary"
      aria-label={label}
      title={label}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden />
      Copy
    </button>
  );
}

export function LocationsTab({ onToast }: LocationsTabProps) {
  const { locations, loading, refresh } = useLocations();
  const { canAccessModule } = useAdminAccess();
  const canOpenAccounting = canAccessModule('accounting');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const takenPins = useMemo(
    () =>
      locations
        .map((location) => location.pin)
        .filter((value): value is string => Boolean(value)),
    [locations],
  );

  const pinTakenInForm =
    pin.trim().length > 0 && isPortalPinTaken(pin, locations);

  function handleGeneratePin() {
    try {
      const nextPin = generateUniquePortalPinFromList(takenPins);
      setPin(nextPin);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not generate PIN.';
      onToast(message, 'error');
    }
  }

  function copyPortalLink() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/portal`
        : '/portal';
    void navigator.clipboard.writeText(url);
    onToast('Portal link copied.');
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setRevealedPin(null);

    const pinError = validatePortalPinFormat(pin);
    if (pinError) {
      onToast(pinError, 'error');
      setSaving(false);
      return;
    }

    if (isPortalPinTaken(pin, locations)) {
      onToast('This PIN is already in use by another client.', 'error');
      setSaving(false);
      return;
    }

    try {
      const result = await createLocation({
        name,
        city,
        code: code || undefined,
        pin,
      });
      setRevealedPin(result.pin);
      setName('');
      setCity('');
      setCode('');
      setPin('');
      void refresh();
      onToast('Client created. Share the PIN for portal access.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create client.';
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
      void refresh();
      onToast('Client updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update client.';
      onToast(message, 'error');
    } finally {
      setSavingEditId(null);
    }
  }

  async function handleRegeneratePin(location: Location) {
    setRegeneratingId(location.id);
    setRevealedPin(null);

    try {
      const newPin = await regenerateLocationPin(location.id);
      setRevealedPin(newPin);
      void refresh();
      onToast(`New PIN generated for ${location.name}.`);
    } catch {
      onToast('Could not regenerate PIN.', 'error');
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleToggleActive(location: Location) {
    try {
      await setLocationActive(location.id, !location.active);
      void refresh();
      onToast(
        location.active
          ? `${location.name} deactivated.`
          : `${location.name} activated.`,
      );
    } catch {
      onToast('Could not update client status.', 'error');
    }
  }

  async function handleDelete(location: Location) {
    const confirmed = window.confirm(
      `Delete "${location.name}" permanently?\n\nEmployees must be reassigned first. Inspections assigned to this client will lose portal access. This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(location.id);

    try {
      const detachedCount = await deleteLocation(location.id);
      void refresh();
      onToast(
        detachedCount > 0
          ? `${location.name} deleted. Portal access removed from ${detachedCount} inspection(s).`
          : `${location.name} deleted.`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete client.';
      onToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <MapPin className="h-4 w-4 text-primary" aria-hidden />
          Clients
        </h2>
        <p className="mt-2 text-sm text-muted">
          Each client is a work site for staff, schedule, attendance, and billing.
          They sign in at{' '}
          <button
            type="button"
            onClick={copyPortalLink}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            /portal
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </button>{' '}
          with the shipment AWB and their company PIN. PINs do not expire unless
          you generate a new one or deactivate the client.
          {canOpenAccounting ? (
            <>
              {' '}
              <Link href="/accounting" className="text-primary hover:underline">
                Edit billing in Accounting
              </Link>
            </>
          ) : null}
        </p>
      </section>

      {revealedPin ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-200">PIN (copy now)</p>
              <p className="mt-1 font-mono text-2xl tracking-widest text-white">
                {revealedPin}
              </p>
            </div>
            <PinCopyButton
              pin={revealedPin}
              onCopied={() => onToast('PIN copied.')}
              label="Copy new PIN"
            />
          </div>
          <p className="mt-2 text-xs text-amber-200/80">
            Share this PIN with the client. It also appears on their card below.
          </p>
          <p className="mt-2 text-xs text-muted">
            Then open an inspection, enable portal access, and assign this client
            before testing at /portal.
          </p>
        </div>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">New client</h3>
        <form onSubmit={(e) => void handleCreate(e)} className="mt-4 min-w-0 space-y-4">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted">
              Client name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="JAS"
              className="w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                City
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="Sydney"
                className="w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                Code (optional)
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SYD"
                className="w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-muted">
              PIN (6–8 digits)
            </label>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
                }
                inputMode="numeric"
                placeholder="Enter or generate"
                required
                className="w-full min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={handleGeneratePin}
                className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-primary sm:w-auto"
                title="Generate unique PIN"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Generate PIN
              </button>
            </div>
            {pinTakenInForm ? (
              <p className="mt-1 text-xs text-amber-300">
                This PIN is already used by another client.
              </p>
            ) : (
              <p className="mt-1 text-xs text-subtle">
                Leave blank and use Generate, or type your own PIN.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving || pinTakenInForm || !pin.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {saving ? 'Creating…' : 'Create client'}
          </button>
        </form>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h3 className="text-sm font-semibold text-white">Registered clients</h3>
        {loading ? (
          <LoadingIndicator />
        ) : locations.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No clients yet.</p>
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
                          setEditForm((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
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
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">PIN:</span>
                        {location.pin ? (
                          <>
                            <span className="font-mono text-sm tracking-wider text-white">
                              {location.pin}
                            </span>
                            <PinCopyButton
                              pin={location.pin}
                              onCopied={() =>
                                onToast(`PIN copied for ${location.name}.`)
                              }
                              label={`Copy PIN for ${location.name}`}
                            />
                          </>
                        ) : (
                          <span className="text-xs text-subtle">
                            Unknown — use New PIN to set one
                          </span>
                        )}
                      </div>
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
                        onClick={() => void handleRegeneratePin(location)}
                        disabled={regeneratingId === location.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${regeneratingId === location.id ? 'animate-spin' : ''}`}
                          aria-hidden
                        />
                        New PIN
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
