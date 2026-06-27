'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGET_ORDER,
} from '@/lib/dashboard/dashboard-widgets';
import {
  loadDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
  type DashboardLayoutState,
} from '@/lib/dashboard/dashboard-layout';

const ALLOWED_WIDGET_IDS = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayoutState>(() =>
    loadDashboardLayout(ALLOWED_WIDGET_IDS),
  );

  useEffect(() => {
    setLayout(loadDashboardLayout(ALLOWED_WIDGET_IDS));
  }, []);

  const orderedVisibleWidgets = useMemo(() => {
    const visible = new Set(layout.visibleWidgets);
    return layout.widgetOrder.filter((id) => visible.has(id));
  }, [layout.visibleWidgets, layout.widgetOrder]);

  const persist = useCallback((next: DashboardLayoutState) => {
    setLayout(next);
    saveDashboardLayout(next);
  }, []);

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      const isVisible = layout.visibleWidgets.includes(widgetId);
      const visibleWidgets = isVisible
        ? layout.visibleWidgets.filter((id) => id !== widgetId)
        : [...layout.visibleWidgets, widgetId];

      const collapsedWidgets = isVisible
        ? layout.collapsedWidgets.filter((id) => id !== widgetId)
        : layout.collapsedWidgets;

      persist({
        ...layout,
        visibleWidgets,
        collapsedWidgets,
        widgetOrder: layout.widgetOrder.includes(widgetId)
          ? layout.widgetOrder
          : [...layout.widgetOrder, widgetId],
      });
    },
    [layout, persist],
  );

  const toggleWidgetCollapsed = useCallback(
    (widgetId: string) => {
      const isCollapsed = layout.collapsedWidgets.includes(widgetId);
      const collapsedWidgets = isCollapsed
        ? layout.collapsedWidgets.filter((id) => id !== widgetId)
        : [...layout.collapsedWidgets, widgetId];

      persist({ ...layout, collapsedWidgets });
    },
    [layout, persist],
  );

  const isWidgetCollapsed = useCallback(
    (widgetId: string) => layout.collapsedWidgets.includes(widgetId),
    [layout.collapsedWidgets],
  );

  const resetLayout = useCallback(() => {
    const defaults = resetDashboardLayout();
    setLayout(defaults);
  }, []);

  const showAllWidgets = useCallback(() => {
    persist({
      visibleWidgets: [...DEFAULT_WIDGET_ORDER],
      collapsedWidgets: [],
      widgetOrder: [...DEFAULT_WIDGET_ORDER],
    });
  }, [persist]);

  return {
    layout,
    orderedVisibleWidgets,
    toggleWidgetVisibility,
    toggleWidgetCollapsed,
    isWidgetCollapsed,
    resetLayout,
    showAllWidgets,
  };
}
