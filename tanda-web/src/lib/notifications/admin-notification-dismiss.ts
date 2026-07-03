import { isInformationalAdminAlert } from '@/lib/notifications/admin-alert-metadata';

export interface AdminNotificationLike {
  id: string;
  count: number;
  requiresAction: boolean;
}

export interface DismissedAdminAlertSnapshot {
  count: number;
  dateKey?: string;
}

export type DismissedAdminAlertsMap = Record<string, DismissedAdminAlertSnapshot>;

export function isDailyAdminAlert(alertId: string): boolean {
  return isInformationalAdminAlert(alertId);
}

export function isAdminAlertVisible(
  item: AdminNotificationLike,
  dismissed: DismissedAdminAlertsMap,
  todayKey: string,
): boolean {
  const snapshot = dismissed[item.id];
  if (!snapshot) return true;

  if (isDailyAdminAlert(item.id)) {
    if (snapshot.dateKey !== todayKey) return true;
    return item.count > snapshot.count;
  }

  return item.count > snapshot.count;
}

export function filterVisibleAdminAlerts<T extends AdminNotificationLike>(
  items: T[],
  dismissed: DismissedAdminAlertsMap,
  todayKey: string,
): T[] {
  return items.filter((item) => isAdminAlertVisible(item, dismissed, todayKey));
}

/** Bell badge: actionable alerts sum people/items; informational counts as one ping each. */
export function computeAdminBadgeCount(items: AdminNotificationLike[]): number {
  return items.reduce(
    (sum, item) => sum + (item.requiresAction ? item.count : 1),
    0,
  );
}

export function parseDismissedAdminAlerts(
  data: Record<string, unknown> | undefined,
  todayKey: string,
): DismissedAdminAlertsMap {
  const map: DismissedAdminAlertsMap = {};
  if (!data) return map;

  const raw = data.dismissedAdminAlerts;
  if (raw && typeof raw === 'object') {
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      if (typeof record.count !== 'number') continue;
      map[id] = {
        count: record.count,
        dateKey: typeof record.dateKey === 'string' ? record.dateKey : undefined,
      };
    }
  }

  const legacyKeys = data.dismissedAdminAlertKeys;
  if (Array.isArray(legacyKeys)) {
    for (const key of legacyKeys) {
      if (typeof key !== 'string' || key in map) continue;
      map[key] = {
        count: Number.MAX_SAFE_INTEGER,
        dateKey: isDailyAdminAlert(key) ? todayKey : undefined,
      };
    }
  }

  return map;
}
