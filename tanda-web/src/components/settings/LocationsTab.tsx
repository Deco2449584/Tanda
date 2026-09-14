'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ClientPhotoUpload } from '@/components/settings/ClientPhotoUpload';
import {
  ClientGeofenceFields,
  emptyGeofenceForm,
  geofenceFormFromLocation,
  parseGeofenceForm,
  validateGeofenceForm,
  type GeofenceFormValue,
} from '@/components/settings/ClientGeofenceFields';
import {
  downloadScanPunchQr,
  ScanPunchQr,
} from '@/components/settings/ScanPunchQr';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { buildScanPunchUrl } from '@/lib/attendance/scan-punch-token';
import { AU_LOCATION_STATES, type AuLocationState } from '@/lib/locations/au-states';
import {
  createLocation,
  regenerateLocationPin,
  regenerateLocationScanPunchToken,
  setLocationActive,
  setLocationScanPunchEnabled,
  updateLocation,
} from '@/lib/locations/locations-service';
import { requestLocationCascadeDelete } from '@/lib/admin/cascade-delete-api';
import { DeleteLocationConfirmModal } from '@/components/settings/DeleteLocationConfirmModal';
import { uploadLocationPhoto } from '@/lib/locations/upload-location-photo';
import {
  generateUniquePortalPinFromList,
  isPortalPinTaken,
  validatePortalPinFormat,
} from '@/lib/portal/pin';
import type { Location } from '@/lib/types/location';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useLocations } from '@/providers/LocationsProvider';
import { isFirebaseStorageUrl } from '@/utils/imageOptimizer';

interface LocationsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

interface ClientFormState {
  name: string;
  city: string;
  state: AuLocationState | '';
  code: string;
  pin: string;
  geofence: GeofenceFormValue;
}

const emptyClientForm = (): ClientFormState => ({
  name: '',
  city: '',
  state: '',
  code: '',
  pin: '',
  geofence: { ...emptyGeofenceForm, required: false },
});

type ViewMode = 'list' | 'create' | 'detail';

const inputClass =
  'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50';

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
  const { canAccessModule, canPerformAction } = useAdminAccess();
  const canOpenAccounting = canAccessModule('accounting');
  const canCreateClients = canPerformAction('settings', 'createLocations');
  const canUpdateClients = canPerformAction('settings', 'updateLocations');
  const canDeleteClients = canPerformAction('settings', 'deleteLocations');

  const [view, setView] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<ClientFormState>(emptyClientForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scanBusyId, setScanBusyId] = useState<string | null>(null);

  const takenPins = useMemo(
    () =>
      locations
        .map((location) => location.pin)
        .filter((value): value is string => Boolean(value)),
    [locations],
  );

  const selectedLocation =
    view === 'detail' && selectedId
      ? (locations.find((item) => item.id === selectedId) ?? null)
      : null;

  useEffect(() => {
    if (view !== 'detail' || !selectedId || loading) return;
    if (!locations.some((item) => item.id === selectedId)) {
      setView('list');
      setSelectedId(null);
      setForm(emptyClientForm());
      setPhotoFile(null);
    }
  }, [view, selectedId, loading, locations]);

  const filteredLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((location) => {
      const haystack = [
        location.name,
        location.city,
        location.state ?? '',
        location.code ?? '',
        location.pin ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [locations, query]);

  const pinTakenInForm =
    view === 'create' &&
    form.pin.trim().length > 0 &&
    isPortalPinTaken(form.pin, locations);

  function openList() {
    setView('list');
    setSelectedId(null);
    setForm(emptyClientForm());
    setPhotoFile(null);
  }

  function openCreate() {
    if (!canCreateClients) {
      onToast('You do not have permission to create clients.', 'error');
      return;
    }
    setView('create');
    setSelectedId(null);
    setForm(emptyClientForm());
    setPhotoFile(null);
    setRevealedPin(null);
  }

  function openDetail(location: Location) {
    setView('detail');
    setSelectedId(location.id);
    setForm({
      name: location.name,
      city: location.city,
      state: location.state ?? '',
      code: location.code ?? '',
      pin: '',
      geofence: geofenceFormFromLocation(location),
    });
    setPhotoFile(null);
  }

  function handleGeneratePin() {
    try {
      const nextPin = generateUniquePortalPinFromList(takenPins);
      setForm((prev) => ({ ...prev, pin: nextPin }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not generate PIN.';
      onToast(message, 'error');
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreateClients) {
      onToast('You do not have permission to create clients.', 'error');
      return;
    }
    setSaving(true);
    setRevealedPin(null);

    const pinError = validatePortalPinFormat(form.pin);
    if (pinError) {
      onToast(pinError, 'error');
      setSaving(false);
      return;
    }

    if (isPortalPinTaken(form.pin, locations)) {
      onToast('This PIN is already in use by another client.', 'error');
      setSaving(false);
      return;
    }

    const geofenceError = validateGeofenceForm(form.geofence);
    if (geofenceError) {
      onToast(geofenceError, 'error');
      setSaving(false);
      return;
    }

    const geofenceInput = parseGeofenceForm(form.geofence);

    try {
      const result = await createLocation({
        name: form.name,
        city: form.city,
        state: form.state || undefined,
        code: form.code || undefined,
        pin: form.pin,
        ...geofenceInput,
      });

      if (photoFile) {
        const photoUrl = await uploadLocationPhoto(result.locationId, photoFile);
        await updateLocation(result.locationId, {
          name: form.name.trim(),
          city: form.city.trim(),
          state: form.state || null,
          code: form.code || undefined,
          photoUrl,
          ...geofenceInput,
        });
      }

      setRevealedPin(result.pin);
      setPhotoFile(null);
      await refresh();
      setSelectedId(result.locationId);
      setView('detail');
      setForm({
        name: form.name.trim(),
        city: form.city.trim(),
        state: form.state,
        code: form.code,
        pin: '',
        geofence: form.geofence,
      });
      onToast('Client created. Share the PIN for portal access.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create client.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedLocation) return;
    if (!canUpdateClients) {
      onToast('You do not have permission to edit clients.', 'error');
      return;
    }

    const geofenceError = validateGeofenceForm(form.geofence);
    if (geofenceError) {
      onToast(geofenceError, 'error');
      return;
    }

    setSaving(true);

    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadLocationPhoto(selectedLocation.id, photoFile);
      }

      await updateLocation(selectedLocation.id, {
        name: form.name,
        city: form.city,
        state: form.state || null,
        code: form.code || undefined,
        ...(photoUrl ? { photoUrl } : {}),
        ...parseGeofenceForm(form.geofence),
      });
      setPhotoFile(null);
      void refresh();
      onToast('Client updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update client.';
      onToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegeneratePin(location: Location) {
    if (!canUpdateClients) {
      onToast('You do not have permission to edit clients.', 'error');
      return;
    }
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
    if (!canUpdateClients) {
      onToast('You do not have permission to edit clients.', 'error');
      return;
    }
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

  async function handleToggleScanPunch(location: Location) {
    if (!canUpdateClients) {
      onToast('You do not have permission to edit clients.', 'error');
      return;
    }
    setScanBusyId(location.id);
    try {
      const enabled = !location.scanPunchEnabled;
      await setLocationScanPunchEnabled(
        location.id,
        enabled,
        location.scanPunchToken,
      );
      void refresh();
      onToast(
        enabled
          ? `Scan clock-in enabled for ${location.name}.`
          : `Scan clock-in disabled for ${location.name}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not update scan clock-in.';
      onToast(message, 'error');
    } finally {
      setScanBusyId(null);
    }
  }

  async function handleRegenerateScanToken(location: Location) {
    if (!canUpdateClients) {
      onToast('You do not have permission to edit clients.', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Generate a new scan link for "${location.name}"?\n\nExisting QR codes and NFC tags will stop working until you update them.`,
    );
    if (!confirmed) return;

    setScanBusyId(location.id);
    try {
      await regenerateLocationScanPunchToken(location.id);
      void refresh();
      onToast(`New scan link generated for ${location.name}.`);
    } catch {
      onToast('Could not regenerate scan link.', 'error');
    } finally {
      setScanBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    const location = pendingDelete;
    if (!location) return;
    if (!canDeleteClients) {
      onToast('You do not have permission to delete clients.', 'error');
      return;
    }

    setDeletingId(location.id);
    setDeleteError(null);

    try {
      await requestLocationCascadeDelete(location.id);
      void refresh();
      setPendingDelete(null);
      if (selectedId === location.id) {
        openList();
      }
      onToast(`${location.name} and associated site data deleted.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not delete client.';
      setDeleteError(message);
      onToast(message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (view === 'detail') {
    if (!selectedLocation) {
      return (
        <div className="min-w-0 space-y-5">
          <button
            type="button"
            onClick={openList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to clients
          </button>
          <LoadingIndicator />
        </div>
      );
    }

    const location = selectedLocation;

    return (
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to clients
          </button>
          {canOpenAccounting ? (
            <Link
              href="/accounting"
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit billing in Accounting
            </Link>
          ) : null}
        </div>

        {revealedPin ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  PIN (copy now)
                </p>
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
              Share this PIN with the client for portal access.
            </p>
          </div>
        ) : null}

        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">{location.name}</h2>
              <p className="mt-1 text-xs text-subtle">
                {[location.city, location.state, location.code]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                location.active
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-zinc-700 text-muted'
              }`}
            >
              {location.active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <form
            onSubmit={(event) => void handleSaveEdit(event)}
            className="mt-5 min-w-0 space-y-4"
          >
            <ClientPhotoUpload
              currentPhotoUrl={location.photoUrl}
              selectedFile={photoFile}
              onFileChange={setPhotoFile}
              disabled={saving || !canUpdateClients}
            />

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                Client name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                disabled={!canUpdateClients}
                placeholder="JAS"
                className={inputClass}
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  required
                  disabled={!canUpdateClients}
                  placeholder="Sydney"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  State (Xero Location)
                </label>
                <select
                  value={form.state}
                  disabled={!canUpdateClients}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      state: (e.target.value as AuLocationState | '') || '',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select state…</option>
                  {AU_LOCATION_STATES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  Code (optional)
                </label>
                <input
                  value={form.code}
                  disabled={!canUpdateClients}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SYD"
                  className={inputClass}
                />
              </div>
            </div>

            <ClientGeofenceFields
              value={form.geofence}
              onChange={(geofence) =>
                setForm((prev) => ({ ...prev, geofence }))
              }
              disabled={saving || !canUpdateClients}
              onError={(message) => onToast(message, 'error')}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              {canUpdateClients ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              ) : (
                <p className="self-center text-xs text-subtle">
                  View only — you need Edit clients permission to save changes.
                </p>
              )}
              <button
                type="button"
                onClick={openList}
                disabled={saving}
                className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50"
              >
                {canUpdateClients ? 'Cancel' : 'Back'}
              </button>
            </div>
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <h3 className="text-sm font-semibold text-white">Portal PIN</h3>
          <p className="mt-1 text-xs text-subtle">
            Clients sign in at /portal with the shipment AWB and this PIN.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {location.pin ? (
              <>
                <span className="font-mono text-lg tracking-wider text-white">
                  {location.pin}
                </span>
                <PinCopyButton
                  pin={location.pin}
                  onCopied={() => onToast(`PIN copied for ${location.name}.`)}
                  label={`Copy PIN for ${location.name}`}
                />
              </>
            ) : (
              <span className="text-xs text-subtle">
                No PIN on file
                {canUpdateClients ? ' — generate one.' : '.'}
              </span>
            )}
            {canUpdateClients ? (
              <button
                type="button"
                onClick={() => void handleRegeneratePin(location)}
                disabled={regeneratingId === location.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted hover:border-zinc-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${regeneratingId === location.id ? 'animate-spin' : ''}`}
                  aria-hidden
                />
                New PIN
              </button>
            ) : null}
          </div>
        </section>

        <ScanPunchControls
          location={location}
          busy={scanBusyId === location.id}
          canManage={canUpdateClients}
          onToggle={() => void handleToggleScanPunch(location)}
          onRegenerate={() => void handleRegenerateScanToken(location)}
          onCopied={() => onToast(`Scan link copied for ${location.name}.`)}
          onDownloaded={() => onToast(`QR downloaded for ${location.name}.`)}
          onDownloadError={() => onToast('Could not download QR.', 'error')}
        />

        {canUpdateClients || canDeleteClients ? (
          <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
            <h3 className="text-sm font-semibold text-white">Actions</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {canUpdateClients ? (
                <button
                  type="button"
                  onClick={() => void handleToggleActive(location)}
                  className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:border-zinc-500"
                >
                  {location.active ? 'Deactivate' : 'Activate'}
                </button>
              ) : null}
              {canDeleteClients ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setPendingDelete(location);
                  }}
                  disabled={deletingId === location.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-400 hover:border-red-700 hover:bg-red-950/40 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {deletingId === location.id ? 'Deleting…' : 'Delete client'}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {canDeleteClients ? (
          <DeleteLocationConfirmModal
            location={pendingDelete}
            loading={Boolean(deletingId)}
            error={deleteError}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={() => {
              if (deletingId) return;
              setPendingDelete(null);
              setDeleteError(null);
            }}
          />
        ) : null}
      </div>
    );
  }

  if (view === 'create') {
    if (!canCreateClients) {
      return (
        <div className="min-w-0 space-y-5">
          <button
            type="button"
            onClick={openList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to clients
          </button>
          <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            You do not have permission to create clients.
          </p>
        </div>
      );
    }

    return (
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openList}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to clients
          </button>
          {canOpenAccounting ? (
            <Link
              href="/accounting"
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit billing in Accounting
            </Link>
          ) : null}
        </div>

        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <div>
            <h2 className="text-sm font-semibold text-white">New client</h2>
            <p className="mt-1 text-xs text-subtle">
              Site details, portal PIN, and optional geofence.
            </p>
          </div>

          <form
            onSubmit={(event) => void handleCreate(event)}
            className="mt-5 min-w-0 space-y-4"
          >
            <ClientPhotoUpload
              selectedFile={photoFile}
              onFileChange={setPhotoFile}
              disabled={saving}
            />

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                Client name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                placeholder="JAS"
                className={inputClass}
              />
            </div>

            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  City
                </label>
                <input
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  required
                  placeholder="Sydney"
                  className={inputClass}
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  State (Xero Location)
                </label>
                <select
                  value={form.state}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      state: (e.target.value as AuLocationState | '') || '',
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select state…</option>
                  {AU_LOCATION_STATES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-muted">
                  Code (optional)
                </label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SYD"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-muted">
                PIN (6–8 digits)
              </label>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  value={form.pin}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pin: e.target.value.replace(/\D/g, '').slice(0, 8),
                    }))
                  }
                  inputMode="numeric"
                  placeholder="Enter or generate"
                  required
                  className={inputClass}
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
                  Used at /portal with the shipment AWB.
                </p>
              )}
            </div>

            <ClientGeofenceFields
              value={form.geofence}
              onChange={(geofence) =>
                setForm((prev) => ({ ...prev, geofence }))
              }
              disabled={saving}
              onError={(message) => onToast(message, 'error')}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={saving || pinTakenInForm || !form.pin.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {saving ? 'Creating…' : 'Create client'}
              </button>
              <button
                type="button"
                onClick={openList}
                disabled={saving}
                className="rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <MapPin className="h-4 w-4 text-primary" aria-hidden />
              Clients
            </h2>
            <p className="mt-2 text-sm text-muted">
              Work sites for staff, schedule, attendance, and billing. Portal
              access uses{' '}
              <Link
                href="/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                /portal
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
              .
              {canOpenAccounting ? (
                <>
                  {' '}
                  <Link
                    href="/accounting"
                    className="text-primary hover:underline"
                  >
                    Edit billing in Accounting
                  </Link>
                </>
              ) : null}
            </p>
          </div>
          {canCreateClients ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-primary/40 bg-primary/15 px-4 text-sm font-semibold text-primary hover:bg-primary/25 sm:w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              New client
            </button>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-white">
            Registered clients
            {!loading ? (
              <span className="ml-2 font-normal text-subtle">
                ({locations.length})
              </span>
            ) : null}
          </h3>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, city, PIN…"
              className="w-full rounded-lg border border-border-strong bg-surface-base py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {loading ? (
          <LoadingIndicator />
        ) : locations.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-subtle" aria-hidden />
            <p className="mt-3 text-sm text-muted">No clients yet.</p>
            {canCreateClients ? (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Create the first client
              </button>
            ) : null}
          </div>
        ) : filteredLocations.length === 0 ? (
          <p className="mt-6 text-sm text-subtle">
            No clients match “{query.trim()}”.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/80 overflow-hidden rounded-xl border border-border">
            {filteredLocations.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  onClick={() => openDetail(location)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-hover/60 sm:px-4"
                >
                  <ClientPhotoThumb
                    photoUrl={location.photoUrl}
                    name={location.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {location.name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          location.active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-700 text-muted'
                        }`}
                      >
                        {location.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-subtle">
                      {[location.city, location.state, location.code]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <ListBadge
                        tone={
                          typeof location.latitude === 'number' &&
                          typeof location.longitude === 'number'
                            ? location.geofenceRequired
                              ? 'ok'
                              : 'muted'
                            : 'warn'
                        }
                        label={
                          typeof location.latitude === 'number' &&
                          typeof location.longitude === 'number'
                            ? location.geofenceRequired
                              ? 'On-site'
                              : 'Geofence off'
                            : 'No coordinates'
                        }
                      />
                      <ListBadge
                        tone={location.scanPunchEnabled ? 'ok' : 'muted'}
                        label={
                          location.scanPunchEnabled ? 'QR / NFC on' : 'QR / NFC off'
                        }
                      />
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-subtle"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DeleteLocationConfirmModal
        location={pendingDelete}
        loading={Boolean(deletingId)}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (deletingId) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

function ListBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
}) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-500/15 text-emerald-300'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-zinc-700/80 text-muted';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClass}`}
    >
      {label}
    </span>
  );
}

function ScanPunchControls({
  location,
  busy,
  canManage = true,
  onToggle,
  onRegenerate,
  onCopied,
  onDownloaded,
  onDownloadError,
}: {
  location: Location;
  busy: boolean;
  canManage?: boolean;
  onToggle: () => void;
  onRegenerate: () => void;
  onCopied: () => void;
  onDownloaded: () => void;
  onDownloadError: () => void;
}) {
  const enabled = location.scanPunchEnabled === true;
  const token = location.scanPunchToken?.trim();
  const qrUrl = token ? buildScanPunchUrl(token, undefined, 'qr') : null;
  const nfcUrl = token ? buildScanPunchUrl(token, undefined, 'nfc') : null;
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!qrUrl) return;
    setDownloading(true);
    try {
      await downloadScanPunchQr({
        url: qrUrl,
        fileName: `${location.name}-${location.code ?? location.city}-scan`,
        size: 1024,
      });
      onDownloaded();
    } catch {
      onDownloadError();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <QrCode className="h-4 w-4 text-primary" aria-hidden />
            QR / NFC clock-in
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-subtle">
            Staff signed into the app scan the QR or tap an NFC tag to punch
            (no PIN or photo). Use the QR link for printed codes and the NFC
            link when programming tags so attendance shows the right source.
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            disabled={busy}
            onClick={onToggle}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
              enabled
                ? 'border border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                : 'border border-border-strong text-muted hover:text-foreground'
            }`}
          >
            {busy ? 'Saving…' : enabled ? 'Disable' : 'Enable'}
          </button>
        ) : (
          <span
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              enabled
                ? 'border border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                : 'border border-border-strong text-muted'
            }`}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        )}
      </div>

      {enabled && !location.geofenceRequired ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          On-site validation is off for this client, so a copied link can be
          used from anywhere. Set coordinates and turn on “Require on-site
          location”.
        </p>
      ) : null}

      {enabled && qrUrl && nfcUrl ? (
        <div className="grid gap-5 border-t border-border/80 pt-4 md:grid-cols-[auto_1fr] md:items-start">
          <div className="mx-auto md:mx-0">
            <ScanPunchQr url={qrUrl} size={168} />
          </div>

          <div className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                QR link
              </p>
              <p className="break-all rounded-lg border border-border bg-surface-base/70 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted">
                {qrUrl}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                NFC link
              </p>
              <p className="break-all rounded-lg border border-border bg-surface-base/70 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted">
                {nfcUrl}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(qrUrl);
                  onCopied();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-primary"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy QR link
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(nfcUrl);
                  onCopied();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-primary"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy NFC link
              </button>
              <button
                type="button"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-primary disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {downloading ? 'Downloading…' : 'Download QR'}
              </button>
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Open
              </a>
              {canManage ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-primary disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  New link
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ClientPhotoThumb({
  photoUrl,
  name,
}: {
  photoUrl?: string;
  name: string;
}) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-hover ring-1 ring-zinc-700">
      {photoUrl ? (
        isFirebaseStorageUrl(photoUrl) ? (
          <FirebaseImage
            src={photoUrl}
            alt={name}
            width={44}
            height={44}
            className="h-full w-full object-cover"
            sizes="44px"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )
      ) : (
        <Building2 className="h-5 w-5 text-subtle" aria-hidden />
      )}
    </div>
  );
}
