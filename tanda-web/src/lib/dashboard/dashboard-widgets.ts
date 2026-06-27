import type { DashboardWidgetDefinition } from './types';

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: 'kpis',
    title: 'Key metrics',
    description: 'Active staff, payroll, late arrivals and pending leave',
    category: 'overview',
    chartType: 'kpi',
    defaultVisible: true,
    defaultExpanded: true,
  },
  {
    id: 'payroll-by-location',
    title: 'Payroll cost by site',
    description: 'Actual payroll cost distributed by location',
    category: 'payroll',
    chartType: 'pie',
    defaultVisible: true,
    defaultExpanded: true,
  },
  {
    id: 'payroll-projected-by-location',
    title: 'Projected payroll by site',
    description: 'Scheduled shift cost distributed by location',
    category: 'payroll',
    chartType: 'pie',
    defaultVisible: false,
    defaultExpanded: true,
  },
  {
    id: 'hours-worked-by-location',
    title: 'Hours worked by site',
    description: 'Billable hours per location in the selected period',
    category: 'payroll',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: true,
  },
  {
    id: 'scheduled-vs-actual',
    title: 'Scheduled vs actual hours',
    description: 'Compare programmed hours against worked hours per site',
    category: 'payroll',
    chartType: 'grouped-bar',
    defaultVisible: true,
    defaultExpanded: false,
  },
  {
    id: 'daily-payroll-trend',
    title: 'Daily payroll trend',
    description: 'Actual payroll cost per day in the selected period',
    category: 'payroll',
    chartType: 'area',
    defaultVisible: false,
    defaultExpanded: true,
  },
  {
    id: 'weekly-hours',
    title: 'Scheduled hours trend',
    description: 'Scheduled hours per day in the selected period',
    category: 'scheduling',
    chartType: 'area',
    defaultVisible: true,
    defaultExpanded: false,
  },
  {
    id: 'shift-load-department',
    title: 'Shifts by department',
    description: 'Number of shifts per department in the period',
    category: 'scheduling',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: false,
  },
  {
    id: 'shifts-by-location',
    title: 'Shifts by site',
    description: 'Number of shifts per location in the period',
    category: 'scheduling',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
  },
  {
    id: 'late-arrivals-by-location',
    title: 'Late arrivals by site',
    description: 'Late check-ins attributed to shift location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: false,
  },
  {
    id: 'no-shows-by-location',
    title: 'No-shows by site',
    description: 'Missed shifts without check-in by location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
  },
  {
    id: 'headcount-by-location',
    title: 'Active staff by site',
    description: 'Headcount of active employees per location',
    category: 'overview',
    chartType: 'pie',
    defaultVisible: true,
    defaultExpanded: false,
  },
  {
    id: 'leave-by-type',
    title: 'Pending leave by type',
    description: 'Open leave requests grouped by type',
    category: 'leave',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
  },
  {
    id: 'attendance-compliance',
    title: 'On-time check-ins by site',
    description: 'Percentage of on-time arrivals per location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
  },
];

export const DASHBOARD_WIDGET_MAP = new Map(
  DASHBOARD_WIDGETS.map((widget) => [widget.id, widget]),
);

export const DEFAULT_WIDGET_ORDER = DASHBOARD_WIDGETS.map((widget) => widget.id);

export function getDefaultVisibleWidgets(): string[] {
  return DASHBOARD_WIDGETS.filter((widget) => widget.defaultVisible).map(
    (widget) => widget.id,
  );
}

export function getDefaultExpandedWidgets(): string[] {
  return DASHBOARD_WIDGETS.filter((widget) => widget.defaultExpanded).map(
    (widget) => widget.id,
  );
}

export const DASHBOARD_CATEGORY_LABELS: Record<
  DashboardWidgetDefinition['category'],
  string
> = {
  overview: 'Overview',
  payroll: 'Payroll',
  attendance: 'Attendance',
  scheduling: 'Scheduling',
  leave: 'Leave',
};
