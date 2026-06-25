'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Lock,
  MonitorSmartphone,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  UserX,
} from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { auth } from '@/lib/firebase';
import { subscribeLocations } from '@/lib/locations/locations-service';
import type { KioskDevice } from '@/lib/types/kiosk-device';
import type { Location } from '@/lib/types/location';

interface KioskDevicesTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not signed in.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function KioskDevicesTab({ onToast }: KioskDevicesTabProps) {
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<
      string,
      { name: string; locationId: string; lockedMode: boolean; lockPin: string }
    >
  >({});

  const loadDevices = useCallback(async () => {
    const response = await fetch('/api/kiosk/devices', {
      headers: await authHeaders(),
    });

    if (!response.ok) {
      throw new Error('Could not load kiosk devices.');
    }

    const data = (await response.json()) as { devices: KioskDevice[] };
    setDevices(data.devices);
    // Re-sync edit drafts with the latest server state.
    setEdits(() => {
      const next: Record<
        string,
        { name: string; locationId: string; lockedMode: boolean; lockPin: string }
      > = {};
      data.devices.forEach((device) => {
        next[device.id] = {
          name: device.name,
          locationId: device.locationId,
          lockedMode: device.type === 'tablet',
          lockPin: '',
        };
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const unsubLocations = subscribeLocations(setLocations);
    void loadDevices()
      .catch(() => onToast('Could not load kiosk devices.', 'error'))
      .finally(() => setLoading(false));

    return () => unsubLocations();
  }, [loadDevices, onToast]);

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active),
    [locations],
  );

  const activeDevices = devices.filter((device) => device.status === 'active');
  const revokedDevices = devices.filter((device) => device.status === 'revoked');

  const activeDevicesByUser = useMemo(() => {
    const groups = new Map<string, KioskDevice[]>();
    for (const device of activeDevices) {
      const key = device.ownerEmail ?? device.createdBy ?? 'unknown';
      const list = groups.get(key) ?? [];
      list.push(device);
      groups.set(key, list);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activeDevices]);

  function locationLabel(locationId: string) {
    const location = locations.find((item) => item.id === locationId);
    if (!location) return '—';
    return location.city ? `${location.name} (${location.city})` : location.name;
  }

  function patchEdit(
    deviceId: string,
    device: KioskDevice,
    patch: Partial<{ name: string; locationId: string; lockedMode: boolean; lockPin: string }>,
  ) {
    setEdits((current) => {
      const base = current[deviceId] ?? {
        name: device.name,
        locationId: device.locationId,
        lockedMode: device.type === 'tablet',
        lockPin: '',
      };
      return { ...current, [deviceId]: { ...base, ...patch } };
    });
  }

  async function handleSave(device: KioskDevice) {
    const form = edits[device.id];
    if (!form?.name.trim() || !form.locationId) {
      onToast('Name and warehouse are required.', 'error');
      return;
    }

    const pin = form.lockPin.trim();
    if (pin && !/^\d{4,8}$/.test(pin)) {
      onToast('The lock PIN must be 4 to 8 digits.', 'error');
      return;
    }

    // Enabling locked mode requires a PIN if the device doesn't already have one.
    if (form.lockedMode && !device.hasLockPin && !pin) {
      onToast('Set a 4 to 8 digit PIN to enable locked kiosk mode.', 'error');
      return;
    }

    setBusyId(device.id);
    try {
      const response = await fetch(`/api/kiosk/devices/${device.id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          locationId: form.locationId,
          type: form.lockedMode ? 'tablet' : 'mobile',
          ...(pin ? { lockPin: pin } : {}),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Save failed.');
      }
      onToast('Device updated.');
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Save failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(device: KioskDevice) {
    if (!window.confirm(`Revoke this browser session for "${device.name || 'this device'}"?`)) return;

    setBusyId(device.id);
    try {
      const response = await fetch('/api/kiosk/devices/revoke', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ deviceId: device.id, scope: 'session' }),
      });
      if (!response.ok) throw new Error('Revoke failed.');
      onToast('Browser session revoked.');
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Revoke failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevokeUser(ownerEmail: string, sessionCount: number) {
    if (
      !window.confirm(
        `Revoke all ${sessionCount} kiosk session${sessionCount === 1 ? '' : 's'} for ${ownerEmail}?`,
      )
    ) {
      return;
    }

    setBusyId(`user:${ownerEmail}`);
    try {
      const response = await fetch('/api/kiosk/devices/revoke', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ ownerEmail, scope: 'user' }),
      });
      if (!response.ok) throw new Error('Revoke failed.');
      const data = (await response.json()) as { revokedCount?: number };
      onToast(
        data.revokedCount
          ? `Revoked ${data.revokedCount} session${data.revokedCount === 1 ? '' : 's'}.`
          : 'No active sessions to revoke.',
      );
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Revoke failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(device: KioskDevice) {
    setBusyId(device.id);
    try {
      const response = await fetch('/api/kiosk/devices/restore', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ deviceId: device.id }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Restore failed.');
      }
      onToast('Device access restored.');
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Restore failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(device: KioskDevice) {
    if (!window.confirm(`Permanently delete "${device.name || 'this device'}"?`)) return;

    setBusyId(device.id);
    try {
      const response = await fetch(`/api/kiosk/devices/${device.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!response.ok) throw new Error('Delete failed.');
      onToast('Device deleted.');
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Delete failed.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex items-start gap-3">
          <MonitorSmartphone className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-white">Kiosk devices</h2>
            <p className="mt-1 text-sm text-subtle">
              Devices appear here automatically when someone activates{' '}
              <code className="text-muted">/kiosk</code> on a tablet or phone. Sessions are
              grouped by user; revoke one browser window or all sessions for a user.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingIndicator />
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-surface-raised p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Active devices</h3>
            {activeDevices.length === 0 ? (
              <p className="text-sm text-subtle">No active kiosk devices.</p>
            ) : (
              <div className="space-y-6">
                {activeDevicesByUser.map(([ownerEmail, userDevices]) => (
                  <div key={ownerEmail} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
                          {ownerEmail}
                        </p>
                        <p className="text-xs text-subtle">
                          {userDevices.length} browser session
                          {userDevices.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {ownerEmail !== 'unknown' ? (
                        <button
                          type="button"
                          disabled={busyId === `user:${ownerEmail}`}
                          onClick={() => void handleRevokeUser(ownerEmail, userDevices.length)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-60"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Revoke all for user
                        </button>
                      ) : null}
                    </div>

                    <ul className="space-y-3">
                      {userDevices.map((device) => (
                        <li
                          key={device.id}
                          className="rounded-xl border border-border bg-surface-base/50 p-4"
                        >
                          <DeviceHeader device={device} showSessionLabel />

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <input
                              value={edits[device.id]?.name ?? ''}
                              onChange={(event) =>
                                patchEdit(device.id, device, { name: event.target.value })
                              }
                              placeholder="Device name"
                              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white"
                            />
                            <select
                              value={edits[device.id]?.locationId ?? ''}
                              onChange={(event) =>
                                patchEdit(device.id, device, { locationId: event.target.value })
                              }
                              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white"
                            >
                              <option value="">Select warehouse…</option>
                              {activeLocations.map((location) => (
                                <option key={location.id} value={location.id}>
                                  {location.city
                                    ? `${location.name} (${location.city})`
                                    : location.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-base/60 px-3 py-2.5">
                            <div className="min-w-0 pr-3">
                              <p className="text-sm font-medium text-foreground">
                                Locked kiosk mode
                              </p>
                              <p className="mt-0.5 text-xs text-subtle">
                                On: shared tablet, fullscreen, PIN required to exit. Off: personal
                                device, no lock.
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={edits[device.id]?.lockedMode ?? false}
                              aria-label="Toggle locked kiosk mode"
                              onClick={() =>
                                patchEdit(device.id, device, {
                                  lockedMode: !(edits[device.id]?.lockedMode ?? false),
                                })
                              }
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                                edits[device.id]?.lockedMode ? 'bg-primary' : 'bg-zinc-700'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                                  edits[device.id]?.lockedMode ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {edits[device.id]?.lockedMode ? (
                            <input
                              value={edits[device.id]?.lockPin ?? ''}
                              inputMode="numeric"
                              maxLength={8}
                              onChange={(event) =>
                                patchEdit(device.id, device, {
                                  lockPin: event.target.value.replace(/\D/g, ''),
                                })
                              }
                              placeholder={
                                device.hasLockPin
                                  ? 'New lock PIN (leave blank to keep current)'
                                  : 'Set a 4 to 8 digit lock PIN'
                              }
                              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm tracking-widest text-white"
                            />
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === device.id}
                              onClick={() => void handleSave(device)}
                              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              <Save className="h-4 w-4" />
                              Save changes
                            </button>
                            <button
                              type="button"
                              disabled={busyId === device.id}
                              onClick={() => void handleRevoke(device)}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-60"
                            >
                              <Lock className="h-4 w-4" />
                              Revoke session
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {revokedDevices.length > 0 ? (
            <section className="rounded-2xl border border-border bg-surface-raised p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Revoked devices</h3>
              <ul className="space-y-3">
                {revokedDevices.map((device) => (
                  <li
                    key={device.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-base/50 p-4"
                  >
                    <div className="min-w-0">
                      <DeviceHeader device={device} />
                      <p className="mt-1 text-xs text-subtle">
                        Warehouse: {locationLabel(device.locationId)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === device.id}
                        onClick={() => void handleRestore(device)}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary hover:bg-primary/20 disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore access
                      </button>
                      <button
                        type="button"
                        disabled={busyId === device.id}
                        onClick={() => void handleDelete(device)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function DeviceHeader({
  device,
  showSessionLabel = false,
}: {
  device: KioskDevice;
  showSessionLabel?: boolean;
}) {
  const TypeIcon = device.type === 'mobile' ? Smartphone : Tablet;
  const detailParts = [
    device.details?.model,
    device.details?.os,
    device.details?.browser,
    device.details?.screen,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center gap-2">
        <TypeIcon className="h-4 w-4 shrink-0 text-primary" />
        <p className="truncate text-sm font-medium text-white">
          {device.name || `Device ${device.id.slice(-6).toUpperCase()}`}
        </p>
        {showSessionLabel ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-subtle">
            Session {device.id.slice(-6).toUpperCase()}
          </span>
        ) : null}
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-subtle">
          {device.type}
        </span>
        {device.hasLockPin ? (
          <Lock className="h-3.5 w-3.5 text-subtle" aria-label="Lock PIN set" />
        ) : null}
      </div>
      {detailParts.length > 0 ? (
        <p className="mt-1 truncate text-xs text-subtle">{detailParts.join(' · ')}</p>
      ) : null}
      <p className="mt-1 text-xs text-subtle">
        Added {new Date(device.createdAt).toLocaleDateString()}
        {device.createdBy ? ` by ${device.createdBy}` : ''}
        {device.lastSeenAt
          ? ` · last seen ${new Date(device.lastSeenAt).toLocaleString()}`
          : ''}
      </p>
    </div>
  );
}
