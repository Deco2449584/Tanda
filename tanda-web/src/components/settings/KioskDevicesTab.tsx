'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { MonitorSmartphone, ShieldCheck, ShieldOff } from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { KioskDevice } from '@/lib/types/kiosk-device';
import type { Location } from '@/lib/types/location';
import { subscribeLocations } from '@/lib/locations/locations-service';

interface KioskDevicesTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function KioskDevicesTab({ onToast }: KioskDevicesTabProps) {
  const [devices, setDevices] = useState<KioskDevice[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [approveForms, setApproveForms] = useState<
    Record<string, { label: string; locationId: string }>
  >({});

  const loadDevices = useCallback(async () => {
    const user = auth?.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const response = await fetch('/api/kiosk/devices', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Could not load kiosk devices.');
    }

    const data = (await response.json()) as { devices: KioskDevice[] };
    setDevices(data.devices);
  }, []);

  useEffect(() => {
    const unsubLocations = subscribeLocations(setLocations);
    void loadDevices()
      .catch(() => onToast('Could not load kiosk devices.', 'error'))
      .finally(() => setLoading(false));

    return () => unsubLocations();
  }, [loadDevices, onToast]);

  const activeLocations = locations.filter((location) => location.active);
  const pendingDevices = devices.filter((device) => device.status === 'pending');
  const activeDevices = devices.filter((device) => device.status === 'active');

  async function handleApprove(deviceId: string) {
    const form = approveForms[deviceId];
    if (!form?.locationId) {
      onToast('Select a warehouse for this device.', 'error');
      return;
    }

    setApprovingId(deviceId);
    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('Not signed in.');

      const token = await user.getIdToken();
      const response = await fetch('/api/kiosk/devices/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId,
          locationId: form.locationId,
          label: form.label,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Approve failed.');
      }

      onToast('Kiosk device approved.');
      await loadDevices();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Approve failed.', 'error');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleRevoke(deviceId: string, options?: { pending?: boolean }) {
    const isPending = options?.pending === true;
    const confirmMessage = isPending
      ? 'Reject this tablet request? It will not be able to clock in until it registers again.'
      : 'Revoke access for this kiosk device?';

    if (!window.confirm(confirmMessage)) return;

    if (isPending) {
      setRejectingId(deviceId);
    }

    try {
      const user = auth?.currentUser;
      if (!user) throw new Error('Not signed in.');

      const token = await user.getIdToken();
      const response = await fetch('/api/kiosk/devices/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) throw new Error(isPending ? 'Reject failed.' : 'Revoke failed.');
      onToast(isPending ? 'Kiosk request rejected.' : 'Kiosk device revoked.');
      await loadDevices();
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : isPending
            ? 'Reject failed.'
            : 'Revoke failed.',
        'error',
      );
    } finally {
      if (isPending) {
        setRejectingId(null);
      }
    }
  }

  function locationLabel(locationId?: string) {
    if (!locationId) return '—';
    const location = locations.find((item) => item.id === locationId);
    if (!location) return '—';
    return location.city ? `${location.name} (${location.city})` : location.name;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex items-start gap-3">
          <MonitorSmartphone className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-white">Kiosk devices</h2>
            <p className="mt-1 text-sm text-subtle">
              Approve tablets that open <code className="text-muted">/kiosk</code> and assign
              each terminal to one warehouse.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-subtle">Loading devices…</p>
      ) : (
        <>
          <DeviceSection
            title="Pending approval"
            emptyText="No devices waiting for approval."
            devices={pendingDevices}
            renderActions={(device) => (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-subtle">
                  Device code: <span className="font-mono text-muted">{device.id.slice(-6).toUpperCase()}</span>
                </p>
                <input
                  value={approveForms[device.id]?.label ?? ''}
                  onChange={(event) =>
                    setApproveForms((current) => ({
                      ...current,
                      [device.id]: {
                        label: event.target.value,
                        locationId: current[device.id]?.locationId ?? '',
                      },
                    }))
                  }
                  placeholder="Device label (optional)"
                  className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white"
                />
                <select
                  value={approveForms[device.id]?.locationId ?? ''}
                  onChange={(event) =>
                    setApproveForms((current) => ({
                      ...current,
                      [device.id]: {
                        label: current[device.id]?.label ?? '',
                        locationId: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white"
                >
                  <option value="">Select warehouse…</option>
                  {activeLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.city ? `${location.name} (${location.city})` : location.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={approvingId === device.id || rejectingId === device.id}
                    onClick={() => void handleApprove(device.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {approvingId === device.id ? 'Approving…' : 'Approve device'}
                  </button>
                  <button
                    type="button"
                    disabled={approvingId === device.id || rejectingId === device.id}
                    onClick={() => void handleRevoke(device.id, { pending: true })}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-60"
                  >
                    <ShieldOff className="h-4 w-4" />
                    {rejectingId === device.id ? 'Rejecting…' : 'Reject request'}
                  </button>
                </div>
              </div>
            )}
          />

          <DeviceSection
            title="Active devices"
            emptyText="No active kiosk devices."
            devices={activeDevices}
            renderMeta={(device) => (
              <p className="mt-1 text-xs text-subtle">
                Warehouse: {locationLabel(device.locationId)}
                {device.label ? ` · ${device.label}` : ''}
              </p>
            )}
            renderActions={(device) => (
              <button
                type="button"
                onClick={() => void handleRevoke(device.id)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30"
              >
                <ShieldOff className="h-4 w-4" />
                Revoke access
              </button>
            )}
          />
        </>
      )}
    </div>
  );
}

function DeviceSection({
  title,
  emptyText,
  devices,
  renderMeta,
  renderActions,
}: {
  title: string;
  emptyText: string;
  devices: KioskDevice[];
  renderMeta?: (device: KioskDevice) => ReactNode;
  renderActions: (device: KioskDevice) => ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {devices.length === 0 ? (
        <p className="text-sm text-subtle">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {devices.map((device) => (
            <li
              key={device.id}
              className="rounded-xl border border-border bg-surface-base/50 p-4"
            >
              <p className="text-sm font-medium text-white">
                {device.label || `Device ${device.id.slice(-6).toUpperCase()}`}
              </p>
              <p className="mt-1 text-xs text-subtle">
                Requested {new Date(device.requestedAt).toLocaleString()}
              </p>
              {device.userAgent ? (
                <p className="mt-1 truncate text-xs text-subtle">{device.userAgent}</p>
              ) : null}
              {renderMeta?.(device)}
              {renderActions(device)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
