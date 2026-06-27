'use client';

import {
  NOTIFICATION_CHANNEL_KEYS,
  NOTIFICATION_CHANNEL_LABELS,
  type NotificationChannelKey,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';

interface NotificationChannelPreferencesPanelProps {
  channels: NotificationChannelPreferences;
  saving?: boolean;
  onChange: (channels: NotificationChannelPreferences) => void;
}

export function NotificationChannelPreferencesPanel({
  channels,
  saving = false,
  onChange,
}: NotificationChannelPreferencesPanelProps) {
  function toggleChannel(key: NotificationChannelKey, enabled: boolean) {
    onChange({ ...channels, [key]: enabled });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">Activity alerts</p>
        <p className="mt-0.5 text-xs text-subtle">
          Enable or disable activity types across your tray, admin alerts, and push.
        </p>
      </div>

      {NOTIFICATION_CHANNEL_KEYS.map((key) => {
        const label = NOTIFICATION_CHANNEL_LABELS[key];
        const enabled = channels[key] !== false;

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-base/40 px-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label.title}</p>
              <p className="mt-0.5 text-xs text-subtle">{label.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${label.title}`}
              disabled={saving}
              onClick={() => toggleChannel(key, !enabled)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                enabled ? 'bg-primary' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
