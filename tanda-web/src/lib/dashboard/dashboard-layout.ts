import {
  DEFAULT_WIDGET_ORDER,
  getDefaultExpandedWidgets,
  getDefaultVisibleWidgets,
} from './dashboard-widgets';

/** Bumped when default visibility policy changes. */
const STORAGE_KEY = 'tanda-dashboard-layout-v2';

export interface DashboardLayoutState {
  visibleWidgets: string[];
  collapsedWidgets: string[];
  widgetOrder: string[];
}

function createDefaultLayout(): DashboardLayoutState {
  const visible = getDefaultVisibleWidgets();
  const expanded = new Set(getDefaultExpandedWidgets());

  return {
    visibleWidgets: visible,
    collapsedWidgets: visible.filter((id) => !expanded.has(id)),
    widgetOrder: DEFAULT_WIDGET_ORDER,
  };
}

function sanitizeWidgetIds(ids: string[], allowed: Set<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    if (!allowed.has(id) || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });

  return result;
}

export function loadDashboardLayout(
  allowedWidgetIds: Set<string>,
): DashboardLayoutState {
  if (typeof window === 'undefined') {
    return createDefaultLayout();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultLayout();

    const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>;
    const defaults = createDefaultLayout();

    const savedOrder = sanitizeWidgetIds(
      parsed.widgetOrder ?? defaults.widgetOrder,
      allowedWidgetIds,
    );
    const visibleWidgets = sanitizeWidgetIds(
      parsed.visibleWidgets ?? defaults.visibleWidgets,
      allowedWidgetIds,
    );

    const missingOrderIds = DEFAULT_WIDGET_ORDER.filter(
      (id) => allowedWidgetIds.has(id) && !savedOrder.includes(id),
    );
    const widgetOrder = [...savedOrder, ...missingOrderIds];

    const collapsedWidgets = sanitizeWidgetIds(
      parsed.collapsedWidgets ?? defaults.collapsedWidgets,
      new Set(visibleWidgets),
    );

    return {
      visibleWidgets,
      collapsedWidgets,
      widgetOrder:
        widgetOrder.length > 0
          ? widgetOrder
          : DEFAULT_WIDGET_ORDER.filter((id) => allowedWidgetIds.has(id)),
    };
  } catch {
    return createDefaultLayout();
  }
}

export function saveDashboardLayout(state: DashboardLayoutState): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function resetDashboardLayout(
  allowedWidgetIds?: Set<string>,
): DashboardLayoutState {
  const defaults = createDefaultLayout();
  if (allowedWidgetIds) {
    defaults.visibleWidgets = sanitizeWidgetIds(
      defaults.visibleWidgets,
      allowedWidgetIds,
    );
    defaults.widgetOrder = sanitizeWidgetIds(
      defaults.widgetOrder,
      allowedWidgetIds,
    );
    defaults.collapsedWidgets = sanitizeWidgetIds(
      defaults.collapsedWidgets,
      new Set(defaults.visibleWidgets),
    );
  }
  saveDashboardLayout(defaults);
  return defaults;
}
