'use client';

import { useEffect, useState } from 'react';
import { NotificationChannelPreferencesPanel } from '@/components/notifications/NotificationChannelPreferencesPanel';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { isAdminAreaRole } from '@/lib/auth/roles';
import {
  saveNotificationChannels,
  subscribeToNotificationChannels,
} from '@/lib/notifications/employee-notification-preferences';
import {
  ADMIN_NOTIFICATION_CHANNEL_KEYS,
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';

export function NotificationsSettingsTab() {
  const { user, role } = useAuthRole();
  const { isMaster } = useAdminAccess();
  const { settings, saveSettings, saving: savingSettings } = useCompanySettings();
  const canManagePush = isAdminAreaRole(role ?? 'empleado');
  const email = user?.email?.trim().toLowerCase() ?? '';
  const [channels, setChannels] = useState<NotificationChannelPreferences>(
    mapNotificationChannels(null),
  );
  const [saving, setSaving] = useState(false);
  const [systemPushBusy, setSystemPushBusy] = useState(false);
  const {
    supported: pushSupported,
    enabled: pushEnabled,
    busy: pushBusy,
    error: pushError,
    enable: enablePush,
    disable: disablePush,
    refreshSubscriptionState,
  } = usePushNotifications();

  const systemPushEnabled = settings.pushNotificationsEnabled !== false;
  const shiftEmailEnabled = settings.shiftEmailNotificationsEnabled === true;

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

  async function handleSystemPushToggle() {
    setSystemPushBusy(true);
    try {
      await saveSettings({
        ...settings,
        pushNotificationsEnabled: !systemPushEnabled,
      });
    } catch (error) {
      console.error('handleSystemPushToggle', error);
    } finally {
      setSystemPushBusy(false);
    }
  }

  async function handleShiftEmailToggle() {
    setSystemPushBusy(true);
    try {
      await saveSettings({
        ...settings,
        shiftEmailNotificationsEnabled: !shiftEmailEnabled,
      });
    } catch (error) {
      console.error('handleShiftEmailToggle', error);
    } finally {
      setSystemPushBusy(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div>
        <h2 className="text-sm font-semibold text-white">Notifications</h2>
        <p className="mt-1 text-xs text-subtle">
          {isMaster
            ? 'Organization controls apply to everyone. Activity alerts below only affect this Master account.'
            : 'Activity alerts below only affect your account. Device push is for this browser or phone.'}
        </p>
      </div>

      {isMaster ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white">Organization</p>
            <p className="mt-0.5 text-xs text-subtle">
              Master-only kill switches. Employees cannot override these.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface-base/50 p-4">
            <p className="text-sm font-medium text-foreground">Browser push (system-wide)</p>
            <p className="mt-1 text-xs text-subtle">
              Turns push on or off for all users. When disabled, employees cannot enable
              device push until you turn this back on.
            </p>

            <button
              type="button"
              disabled={systemPushBusy || savingSettings}
              onClick={() => void handleSystemPushToggle()}
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                systemPushEnabled
                  ? 'border border-border-strong text-muted transition-colors hover:bg-surface-hover hover:text-foreground'
                  : 'bg-primary text-white hover:opacity-90'
              }`}
            >
              {systemPushBusy || savingSettings
                ? 'Updating…'
                : systemPushEnabled
                  ? 'Disable push system-wide'
                  : 'Enable push system-wide'}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface-base/50 p-4">
            <p className="text-sm font-medium text-foreground">Shift schedule emails</p>
            <p className="mt-1 text-xs text-subtle">
              When enabled, employees can receive email when a shift is assigned or
              cancelled (requires Resend and their schedule channel on).
            </p>

            <button
              type="button"
              disabled={systemPushBusy || savingSettings}
              onClick={() => void handleShiftEmailToggle()}
              className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                shiftEmailEnabled
                  ? 'border border-border-strong text-muted transition-colors hover:bg-surface-hover hover:text-foreground'
                  : 'bg-primary text-white hover:opacity-90'
              }`}
            >
              {systemPushBusy || savingSettings
                ? 'Updating…'
                : shiftEmailEnabled
                  ? 'Disable shift emails'
                  : 'Enable shift emails'}
            </button>
          </div>
        </div>
      ) : null}

      <NotificationChannelPreferencesPanel
        channels={channels}
        saving={saving}
        onChange={handleChannelsChange}
        channelKeys={ADMIN_NOTIFICATION_CHANNEL_KEYS}
        title="Your activity alerts"
        description="Personal preferences for this signed-in account only. Employees manage their own alerts in their Settings."
      />

      {canManagePush && !isMaster && pushSupported ? (
        <div className="rounded-xl border border-border bg-surface-base/50 p-4">
          <p className="text-sm font-medium text-foreground">Push on this device</p>
          <p className="mt-1 text-xs text-subtle">
            Asks the browser or phone for notification permission for this device.
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
