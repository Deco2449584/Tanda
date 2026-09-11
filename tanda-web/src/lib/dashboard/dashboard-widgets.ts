import type { AdminModuleKey } from '@/lib/types/admin-permissions';
import type { DashboardWidgetDefinition } from './types';

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  {
    id: 'kpis',
    title: 'Key metrics',
    description: 'Live ops counters for modules you can access',
    category: 'overview',
    chartType: 'kpi',
    defaultVisible: true,
    defaultExpanded: true,
  },
  {
    id: 'working-now',
    title: 'Working now',
    description: 'Live view of who is clocked in and which client site they are at',
    category: 'overview',
    chartType: 'live',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'attendance',
  },
  {
    id: 'upcoming-birthdays',
    title: 'Upcoming birthdays',
    description: 'Staff birthdays in the next 7 days',
    category: 'overview',
    chartType: 'list',
    defaultVisible: true,
    defaultExpanded: false,
    requiresModule: 'employees',
  },
  {
    id: 'punches-by-source',
    title: 'Punches by source',
    description: 'How attendance was recorded (scan, kiosk, manual)',
    category: 'attendance',
    chartType: 'pie',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'attendance',
  },
  {
    id: 'courses-status',
    title: 'Course enrollments',
    description: 'Training progress across assigned staff',
    category: 'training',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'courses',
  },
  {
    id: 'open-issues',
    title: 'Open issue reports',
    description: 'Unresolved staff reports by category',
    category: 'operations',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'issueReports',
  },
  {
    id: 'inspections-overview',
    title: 'Inspections overview',
    description: 'Cargo inspections in the selected period',
    category: 'operations',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: false,
    requiresModule: 'inspections',
  },
  {
    id: 'payroll-by-location',
    title: 'Payroll cost by site',
    description: 'Actual payroll cost distributed by location',
    category: 'payroll',
    chartType: 'pie',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'accounting',
  },
  {
    id: 'payroll-projected-by-location',
    title: 'Projected payroll by site',
    description: 'Scheduled shift cost distributed by location',
    category: 'payroll',
    chartType: 'pie',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'accounting',
  },
  {
    id: 'hours-worked-by-location',
    title: 'Hours worked by site',
    description: 'Billable hours per location in the selected period',
    category: 'payroll',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'payroll',
  },
  {
    id: 'scheduled-vs-actual',
    title: 'Scheduled vs actual hours',
    description: 'Compare programmed hours against worked hours per site',
    category: 'payroll',
    chartType: 'grouped-bar',
    defaultVisible: false,
    defaultExpanded: false,
    requiresModule: 'payroll',
  },
  {
    id: 'daily-payroll-trend',
    title: 'Daily payroll trend',
    description: 'Actual payroll cost per day in the selected period',
    category: 'payroll',
    chartType: 'area',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'accounting',
  },
  {
    id: 'weekly-hours',
    title: 'Scheduled hours trend',
    description: 'Scheduled hours per day in the selected period',
    category: 'scheduling',
    chartType: 'area',
    defaultVisible: false,
    defaultExpanded: false,
    requiresModule: 'schedule',
  },
  {
    id: 'shift-load-department',
    title: 'Shifts by department',
    description: 'Number of shifts per department in the period',
    category: 'scheduling',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: false,
    requiresModule: 'schedule',
  },
  {
    id: 'shifts-by-location',
    title: 'Shifts by site',
    description: 'Number of shifts per location in the period',
    category: 'scheduling',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'schedule',
  },
  {
    id: 'late-arrivals-by-location',
    title: 'Late arrivals by site',
    description: 'Late check-ins attributed to shift location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: false,
    requiresModule: 'attendance',
  },
  {
    id: 'no-shows-by-location',
    title: 'No-shows by site',
    description: 'Missed shifts without check-in by location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'attendance',
  },
  {
    id: 'headcount-by-location',
    title: 'Active staff by site',
    description: 'Headcount of active employees per location',
    category: 'overview',
    chartType: 'pie',
    defaultVisible: false,
    defaultExpanded: false,
    requiresModule: 'employees',
  },
  {
    id: 'leave-by-type',
    title: 'Pending leave by type',
    description: 'Open leave requests grouped by type',
    category: 'leave',
    chartType: 'bar',
    defaultVisible: true,
    defaultExpanded: true,
    requiresModule: 'leaveRequests',
  },
  {
    id: 'attendance-compliance',
    title: 'On-time check-ins by site',
    description: 'Percentage of on-time arrivals per location',
    category: 'attendance',
    chartType: 'bar',
    defaultVisible: false,
    defaultExpanded: true,
    requiresModule: 'attendance',
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

export function getAllowedDashboardWidgetIds(
  canAccessModule: (moduleKey: AdminModuleKey) => boolean,
): Set<string> {
  return new Set(
    DASHBOARD_WIDGETS.filter((widget) => {
      if (!widget.requiresModule) return true;
      return canAccessModule(widget.requiresModule);
    }).map((widget) => widget.id),
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
  training: 'Training',
  operations: 'Operations',
};
