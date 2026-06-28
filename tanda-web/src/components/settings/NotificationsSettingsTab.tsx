'use client';

import { useEffect, useState } from 'react';
import { NotificationChannelPreferencesPanel } from '@/components/notifications/NotificationChannelPreferencesPanel';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthRole } from '@/hooks/useAuthRole';
import { isAdminAreaRole } from '@/lib/auth/roles';
import {
  saveNotificationChannels,
  subscribeToNotificationChannels,
} from '@/lib/notifications/employee-notification-preferences';
import {
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';

export function NotificationsSettingsTab() {
  const { user, role } = useAuthRole();
  const canManagePush = isAdminAreaRole(role ?? 'empleado');
  const email = user?.email?.trim().toLowerCase() ?? '';
  const [channels, setChannels] = useState<NotificationChannelPreferences>(
    mapNotificationChannels(null),
  );
  const [saving, setSaving] = useState(false);
  const {
    supported: pushSupported,
    subscribed: pushSubscribed,
    busy: pushBusy,
    error: pushError,
    enable: enablePush,
    disable: disablePush,
  } = usePushNotifications();

  useEffect(() => {
    if (!email) return;
    return subscribeToNotificationChannels(email, setChannels);
  }, [email]);

  function handleChannelsChange(next: NotificationChannelPreferences) {
    if (!email) return;

    setChannels(next);
    setSaving(true);

    void saveNotificationChannels(email, next)
      .catch((error) => {
        console.error('saveNotificationChannels', error);
      })
      .finally(() => {
        setSaving(false);
      });
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Notifications</h2>
        <p className="mt-1 text-xs text-subtle">
          {canManagePush
            ? 'These preferences apply across the app: operational alerts, in-app messages, and push on this device.'
            : 'In-app notification preferences for your account.'}
        </p>
      </div>

      <NotificationChannelPreferencesPanel
        channels={channels}
        saving={saving}
        onChange={handleChannelsChange}
      />

      {canManagePush && pushSupported ? (
        <div className="rounded-xl border border-border bg-surface-base/50 p-4">
          <p className="text-sm font-medium text-foreground">Browser push alerts</p>
          <p className="mt-1 text-xs text-subtle">
            Optional alerts on this device when enabled activities occur, even if the
            tab is closed.
          </p>

          {pushSubscribed ? (
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void disablePush()}
              className="mt-3 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-60"
            >
              {pushBusy ? 'Updating…' : 'Disable push on this device'}
            </button>
          ) : (
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void enablePush()}
              className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pushBusy ? 'Enabling…' : 'Enable push on this device'}
            </button>
          )}

          {pushError ? (
            <p className="mt-2 text-xs text-red-400" role="alert">
              {pushError}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
