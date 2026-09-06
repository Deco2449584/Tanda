'use client';

import { useEffect, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { formatKioskActionLabel } from '@/lib/kiosk/kiosk-action-labels';
import {
  listLocalKioskPunchHistory,
  type LocalKioskPunchHistoryEntry,
} from '@/lib/kiosk/local-punch-history';
import { reauthenticateKioskPassword } from '@/lib/kiosk/reauthenticate-kiosk';
import type { KioskContext } from '@/lib/types/kiosk-context';

interface KioskSettingsPanelProps {
  context: KioskContext;
  activeLocationId: string;
  onLocationChange: (locationId: string) => Promise<void> | void;
  onClose: () => void;
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function KioskSettingsPanel({
  context,
  activeLocationId,
  onLocationChange,
  onClose,
}: KioskSettingsPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<LocalKioskPunchHistoryEntry[]>([]);

  const activeLocation =
    context.allowedLocations.find((item) => item.id === activeLocationId) ??
    context.allowedLocations[0];

  useEffect(() => {
    if (!unlocked) return;
    setLogs(listLocalKioskPunchHistory());
  }, [unlocked]);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    setVerifying(true);
    setError('');
    try {
      await reauthenticateKioskPassword(password);
      setUnlocked(true);
      setPassword('');
    } catch {
      setError('Incorrect password.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleLocationChange(locationId: string) {
    if (locationId === activeLocationId) return;
    setSaving(true);
    setError('');
    try {
      await onLocationChange(locationId);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : 'Could not change client.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kiosk-ambient flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 text-white">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <Settings className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-center text-lg font-semibold">Kiosk settings</h1>
        <p className="mt-1 text-center text-sm text-zinc-400">
          {context.operatorName}
        </p>

        {!unlocked ? (
          <form onSubmit={(event) => void handleUnlock(event)} className="mt-6 space-y-4">
            <p className="text-sm text-zinc-400">
              Enter the kiosk password to change client or view this week&apos;s
              clock activity on this device.
            </p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Kiosk password"
              className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
            >
              {verifying ? 'Checking…' : 'Unlock'}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-white">Active client</h2>
              {context.canChangeLocation ? (
                <select
                  value={activeLocationId}
                  onChange={(event) => void handleLocationChange(event.target.value)}
                  disabled={saving}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  {context.allowedLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.city ? ` (${location.city})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm text-zinc-300">
                  {activeLocation
                    ? `${activeLocation.name}${activeLocation.city ? ` (${activeLocation.city})` : ''}`
                    : 'No client assigned'}
                </p>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">This week on this device</h2>
                <p className="text-[11px] text-zinc-500">
                  {logs.length}/100 · kept 7 days
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                People who clocked in or out on this tablet. Stored only on this device.
              </p>
              {logs.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">No clock activity recorded yet.</p>
              ) : (
                <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left"
                    >
                      <p className="text-xs font-medium text-white">{log.employeeName}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        {formatKioskActionLabel(log.actionType)} · {formatLogTime(log.createdAt)}
                        {log.locationName ? ` · ${log.locationName}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {error ? (
          <p className="mt-4 text-center text-sm font-medium text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
