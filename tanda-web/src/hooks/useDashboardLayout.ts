'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_WIDGETS,
  DEFAULT_WIDGET_ORDER,
  getAllowedDashboardWidgetIds,
} from '@/lib/dashboard/dashboard-widgets';
import {
  loadDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
  type DashboardLayoutState,
} from '@/lib/dashboard/dashboard-layout';

export function useDashboardLayout(canAccessAccounting: boolean) {
  const allowedWidgetIds = useMemo(
    () => getAllowedDashboardWidgetIds(canAccessAccounting),
    [canAccessAccounting],
  );

  const [layout, setLayout] = useState<DashboardLayoutState>(() =>
    loadDashboardLayout(allowedWidgetIds),
  );

  useEffect(() => {
    setLayout(loadDashboardLayout(allowedWidgetIds));
  }, [allowedWidgetIds]);

  const orderedVisibleWidgets = useMemo(() => {
    const visible = new Set(layout.visibleWidgets);
    return layout.widgetOrder.filter(
      (id) => visible.has(id) && allowedWidgetIds.has(id),
    );
  }, [layout.visibleWidgets, layout.widgetOrder, allowedWidgetIds]);

  const persist = useCallback((next: DashboardLayoutState) => {
    setLayout(next);
    saveDashboardLayout(next);
  }, []);

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      if (!allowedWidgetIds.has(widgetId)) return;

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
    [allowedWidgetIds, layout, persist],
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
    const defaults = resetDashboardLayout(allowedWidgetIds);
    setLayout(defaults);
  }, [allowedWidgetIds]);

  const showAllWidgets = useCallback(() => {
    const allAllowed = DEFAULT_WIDGET_ORDER.filter((id) =>
      allowedWidgetIds.has(id),
    );
    persist({
      visibleWidgets: allAllowed,
      collapsedWidgets: [],
      widgetOrder: allAllowed,
    });
  }, [allowedWidgetIds, persist]);

  const availableWidgets = useMemo(
    () => DASHBOARD_WIDGETS.filter((widget) => allowedWidgetIds.has(widget.id)),
    [allowedWidgetIds],
  );

  return {
    layout,
    orderedVisibleWidgets,
    availableWidgets,
    toggleWidgetVisibility,
    toggleWidgetCollapsed,
    isWidgetCollapsed,
    resetLayout,
    showAllWidgets,
  };
}
