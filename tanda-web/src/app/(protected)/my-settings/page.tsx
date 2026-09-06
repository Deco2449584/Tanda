'use client';

import { useEffect, useState } from 'react';
import { NotificationChannelPreferencesPanel } from '@/components/notifications/NotificationChannelPreferencesPanel';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuthRole } from '@/hooks/useAuthRole';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  saveNotificationChannels,
  subscribeToNotificationChannels,
} from '@/lib/notifications/employee-notification-preferences';
import {
  EMPLOYEE_NOTIFICATION_CHANNEL_KEYS,
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';

export default function MySettingsPage() {
  const { user } = useAuthRole();
  const { settings } = useCompanySettings();
  const email = user?.email?.trim().toLowerCase() ?? '';
  const [channels, setChannels] = useState<NotificationChannelPreferences>(
    mapNotificationChannels(null),
  );
  const [saving, setSaving] = useState(false);
  const {
    supported: pushSupported,
    enabled: pushEnabled,
    busy: pushBusy,
    permission: pushPermission,
    error: pushError,
    enable: enablePush,
    disable: disablePush,
    refreshSubscriptionState,
  } = usePushNotifications();

  const systemPushEnabled = settings.pushNotificationsEnabled !== false;

  useEffect(() => {
    if (!email) return;
    return subscribeToNotificationChannels(email, setChannels);
  }, [email]);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

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
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="Settings"
        description="Your personal alert preferences. Organization-wide push is controlled by Master."
      />

      <section className="space-y-6 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <NotificationChannelPreferencesPanel
          channels={channels}
          saving={saving}
          onChange={handleChannelsChange}
          channelKeys={EMPLOYEE_NOTIFICATION_CHANNEL_KEYS}
          title="Your activity alerts"
          description="Choose which updates appear in your tray and push on this account. These do not change company settings."
        />

        {pushSupported && systemPushEnabled ? (
          <div className="rounded-xl border border-border bg-surface-base/50 p-4">
            <p className="text-sm font-medium text-foreground">Push on this device</p>
            <p className="mt-1 text-xs text-subtle">
              {pushPermission === 'denied'
                ? 'Notifications are blocked. Allow them in phone Settings → Apps → Time Tracker Pro → Notifications, then tap Enable.'
                : pushEnabled
                  ? 'Push alerts are on for this device.'
                  : 'Enable asks your phone for notification permission (Android / browser prompt).'}
            </p>

            {pushEnabled ? (
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
                {pushBusy ? 'Waiting for permission…' : 'Enable push on this device'}
              </button>
            )}

            {pushError ? (
              <p className="mt-2 text-xs text-red-400" role="alert">
                {pushError}
              </p>
            ) : null}
          </div>
        ) : !systemPushEnabled ? (
          <p className="rounded-xl border border-border bg-surface-base/50 px-4 py-3 text-xs text-subtle">
            Push notifications are turned off for the organization by Master.
          </p>
        ) : (
          <p className="rounded-xl border border-border bg-surface-base/50 px-4 py-3 text-xs text-subtle">
            Push notifications are not supported in this browser.
          </p>
        )}
      </section>
    </PageContent>
  );
}
