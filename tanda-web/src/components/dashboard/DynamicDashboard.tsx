'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  ChartColumn,
  ChartPie,
  Layers,
  Sigma,
} from 'lucide-react';
import { CollapsibleDashboardCard } from '@/components/dashboard/CollapsibleDashboardCard';
import { DashboardCustomizeDialog } from '@/components/dashboard/DashboardCustomizeDialog';
import {
  DashboardFiltersBar,
  type DashboardPeriodPreset,
} from '@/components/dashboard/DashboardFiltersBar';
import {
  CategoryChart,
  type CategoryChartType,
  type CategorySort,
  type CategoryTopN,
} from '@/components/dashboard/charts/CategoryChart';
import {
  ChartToolbar,
  ChartToolbarGroup,
} from '@/components/dashboard/charts/ChartToolbar';
import {
  DashboardPayrollTrendChart,
  DashboardWeeklyHoursAreaChart,
} from '@/components/dashboard/charts/DashboardAreaChart';
import { DashboardGroupedBarChart } from '@/components/dashboard/charts/DashboardGroupedBarChart';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { UpcomingBirthdaysWidget } from '@/components/dashboard/UpcomingBirthdaysWidget';
import { WidgetInsightChips } from '@/components/dashboard/WidgetInsightChips';
import { WorkingNowWidget } from '@/components/dashboard/WorkingNowWidget';
import { useDashboardComparison } from '@/hooks/useDashboardComparison';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { useDashboardOpsMetrics } from '@/hooks/useDashboardOpsMetrics';
import { useWorkingNow } from '@/hooks/useWorkingNow';
import {
  getCurrentWeekDateRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { computeDashboardAnalytics } from '@/lib/dashboard/compute-analytics';
import { DASHBOARD_WIDGET_MAP } from '@/lib/dashboard/dashboard-widgets';
import { computeDelta, type DeltaSentiment } from '@/lib/dashboard/delta';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import {
  baseKpiMetrics,
  filterKpisForModules,
} from '@/lib/dashboard/kpi-definitions';
import { getPreviousRange } from '@/lib/dashboard/previous-range';
import { buildWidgetInsights } from '@/lib/dashboard/widget-insights';
import type { DashboardAnalytics } from '@/lib/dashboard/compute-analytics';
import type { KpiMetric, NamedValueDatum } from '@/lib/dashboard/types';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';

function createEmptyAnalytics(currency: string): DashboardAnalytics {
  return {
    payrollByLocation: [],
    projectedPayrollByLocation: [],
    hoursWorkedByLocation: [],
    scheduledVsActualByLocation: [],
    dailyPayrollTrend: [],
    weeklyHours: [],
    shiftLoadByDepartment: [],
    shiftsByLocation: [],
    lateArrivalsByLocation: [],
    noShowsByLocation: [],
    headcountByLocation: [],
    leaveByType: [],
    attendanceComplianceByLocation: [],
    punchesBySource: [],
    coursesByStatus: [],
    openIssuesByCategory: [],
    inspectionsOverview: [],
    upcomingBirthdays: [],
    payrollTotal: 0,
    projectedPayrollTotal: 0,
    lateAlertsTotal: 0,
    noShowsTotal: 0,
    pendingLeaveTotal: 0,
    coursesAwaitingReview: 0,
    coursesOverdue: 0,
    openIssuesTotal: 0,
    birthdaysThisWeek: 0,
    inspectionsWithIssues: 0,
    activeStaffLabel: '0/0',
    payrollActualFormatted: formatDashboardCurrency(0, currency),
    payrollProjectedFormatted: formatDashboardCurrency(0, currency),
  };
}

interface WidgetView {
  chartType: CategoryChartType;
  /** Scheduled vs actual only. */
  groupedView: 'grouped' | 'variance';
  sort: CategorySort;
  topN: CategoryTopN;
}

interface CategoryChartConfig {
  data: NamedValueDatum[];
  loading: boolean;
  emptyMessage?: string;
  valueLabel: string;
  yAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  defaultChartType: CategoryChartType;
  orientation?: 'columns' | 'rows';
  showAverage?: boolean;
  highlightExtreme?: 'max' | 'min';
  deltaSentiment?: DeltaSentiment;
  previous?: NamedValueDatum[];
}

const SORT_OPTIONS = [
  { id: 'value' as CategorySort, label: 'By value', icon: ArrowDownWideNarrow },
  { id: 'name' as CategorySort, label: 'A–Z', icon: ArrowDownAZ },
];

const CHART_TYPE_OPTIONS = [
  { id: 'bar' as CategoryChartType, label: 'Bars', icon: ChartColumn },
  { id: 'donut' as CategoryChartType, label: 'Donut', icon: ChartPie },
];

const GROUPED_VIEW_OPTIONS = [
  { id: 'grouped' as const, label: 'Side by side', icon: Layers },
  { id: 'variance' as const, label: 'Variance', icon: Sigma },
];

const TOP_N_OPTIONS = [
  { id: 5 as CategoryTopN, label: 'Top 5' },
  { id: 10 as CategoryTopN, label: 'Top 10' },
  { id: 'all' as CategoryTopN, label: 'All' },
];

interface DynamicDashboardProps {
  initialDateRange?: DateRange;
}

export function DynamicDashboard({
  initialDateRange = getCurrentWeekDateRange(),
}: DynamicDashboardProps) {
  const { employees, loading: employeesLoading } = useEmployees();
  const { settings } = useCompanySettings();
  const { locations } = useLocations();
  const { groups } = useLocationGroups();
  const { canAccessModule } = useAdminAccess();
  const canAccessAccounting = canAccessModule('accounting');
  const canAccessCourses = canAccessModule('courses');
  const canAccessIssueReports = canAccessModule('issueReports');
  const canAccessAttendance = canAccessModule('attendance');
  const canAccessEmployees = canAccessModule('employees');
  const canAccessLeave = canAccessModule('leaveRequests');
  const canAccessPayroll = canAccessModule('payroll');
  const canAccessSchedule = canAccessModule('schedule');
  const canAccessInspections = canAccessModule('inspections');

  const moduleAccessKey = [
    `attendance:${canAccessAttendance}`,
    `employees:${canAccessEmployees}`,
    `leaveRequests:${canAccessLeave}`,
    `courses:${canAccessCourses}`,
    `issueReports:${canAccessIssueReports}`,
    `inspections:${canAccessInspections}`,
    `payroll:${canAccessPayroll}`,
    `accounting:${canAccessAccounting}`,
    `schedule:${canAccessSchedule}`,
  ].join('|');

  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [periodPreset, setPeriodPreset] =
    useState<DashboardPeriodPreset>('this_week');
  const [locationFilter, setLocationFilter] = useState('all');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [widgetViews, setWidgetViews] = useState<
    Record<string, Partial<WidgetView>>
  >({});

  const {
    orderedVisibleWidgets,
    availableWidgets,
    toggleWidgetVisibility,
    toggleWidgetCollapsed,
    isWidgetCollapsed,
    resetLayout,
    showAllWidgets,
    layout,
  } = useDashboardLayout({
    canAccessModule,
    accessKey: moduleAccessKey,
  });

  const { shifts, leaveRequests, attendance, loading, refreshing, refresh } =
    useDashboardData(dateRange);
  const ops = useDashboardOpsMetrics(dateRange);

  const previousRange = useMemo(() => getPreviousRange(dateRange), [dateRange]);
  const comparison = useDashboardComparison(previousRange, compareEnabled);

  const workingNow = useWorkingNow({
    timeZone: settings.timeZone,
    employees,
    locations,
    locationFilter,
  });

  const analyticsInput = useMemo(
    () => ({
      employees,
      leaveRequests,
      locations,
      groups,
      locationFilter,
      attendanceBreak: settings.attendanceBreak,
      attendancePolicy: settings.attendancePolicy,
      timeZone: settings.timeZone,
      currency: settings.currency,
      payRules: settings.payRules,
      payrollAccounting: settings.payrollAccounting,
      courses: ops.metrics.courses,
      issues: ops.metrics.issues,
      inspections: ops.metrics.inspections,
    }),
    [
      employees,
      groups,
      leaveRequests,
      locationFilter,
      locations,
      ops.metrics.courses,
      ops.metrics.inspections,
      ops.metrics.issues,
      settings.attendanceBreak,
      settings.attendancePolicy,
      settings.currency,
      settings.payRules,
      settings.payrollAccounting,
      settings.timeZone,
    ],
  );

  const analytics = useMemo(() => {
    try {
      return computeDashboardAnalytics({
        ...analyticsInput,
        shifts,
        attendance,
        dateRange,
      });
    } catch (error) {
      console.error('DynamicDashboard analytics failed', {
        error,
        timeZone: settings.timeZone,
        dateRange,
        employees: employees.length,
        shifts: shifts.length,
        attendance: attendance.length,
        leaveRequests: leaveRequests.length,
      });
      return createEmptyAnalytics(settings.currency);
    }
  }, [
    analyticsInput,
    attendance,
    dateRange,
    employees.length,
    leaveRequests.length,
    settings.currency,
    settings.timeZone,
    shifts,
  ]);

  /** Same metrics over the preceding window; null unless Compare is on. */
  const previousAnalytics = useMemo(() => {
    if (!compareEnabled || comparison.loading) return null;
    try {
      return computeDashboardAnalytics({
        ...analyticsInput,
        shifts: comparison.shifts,
        attendance: comparison.attendance,
        dateRange: previousRange,
      });
    } catch (error) {
      console.error('DynamicDashboard comparison analytics failed', error);
      return null;
    }
  }, [
    analyticsInput,
    compareEnabled,
    comparison.attendance,
    comparison.loading,
    comparison.shifts,
    previousRange,
  ]);

  const locationOptions = useMemo(
    () => [
      { id: 'all', label: 'All locations' },
      ...locations.map((location) => ({
        id: location.id,
        label: location.city
          ? `${location.name} (${location.city})`
          : location.name,
      })),
    ],
    [locations],
  );

  const metrics: KpiMetric[] = useMemo(
    () =>
      filterKpisForModules(baseKpiMetrics, canAccessModule).map((metric) => {
        if (metric.id === 'active-staff') {
          return {
            ...metric,
            title: periodPreset === 'today' ? 'Active Staff Today' : 'Active Staff',
            value: analytics.activeStaffLabel,
            description: 'Checked in / total active',
          };
        }

        if (metric.id === 'payroll-cost') {
          return {
            ...metric,
            title:
              periodPreset === 'today' ? "Today's Payroll Cost" : 'Payroll Cost',
            value: analytics.payrollActualFormatted,
            valueLabel: 'Actual',
            description: `Projected: ${analytics.payrollProjectedFormatted}`,
            sparkline: analytics.dailyPayrollTrend.map((item) => item.value),
            sparklineLabel: 'Daily payroll in period',
            delta: previousAnalytics
              ? computeDelta(analytics.payrollTotal, previousAnalytics.payrollTotal)
              : undefined,
            deltaSentiment: 'neutral' as DeltaSentiment,
          };
        }

        if (metric.id === 'late-alerts') {
          return {
            ...metric,
            value: String(analytics.lateAlertsTotal),
            delta: previousAnalytics
              ? computeDelta(
                  analytics.lateAlertsTotal,
                  previousAnalytics.lateAlertsTotal,
                )
              : undefined,
            deltaSentiment: 'lower-is-better' as DeltaSentiment,
          };
        }

        if (metric.id === 'pending-permits') {
          return {
            ...metric,
            value: String(analytics.pendingLeaveTotal),
          };
        }

        if (metric.id === 'course-review') {
          return {
            ...metric,
            value: String(analytics.coursesAwaitingReview),
            description:
              analytics.coursesOverdue > 0
                ? `${analytics.coursesOverdue} overdue`
                : 'SUBMISSIONS',
          };
        }

        if (metric.id === 'open-issues') {
          return {
            ...metric,
            value: String(analytics.openIssuesTotal),
          };
        }

        if (metric.id === 'birthdays-week') {
          return {
            ...metric,
            value: String(analytics.birthdaysThisWeek),
          };
        }

        return metric;
      }),
    // moduleAccessKey keeps KPI filter in sync without depending on fn identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analytics, moduleAccessKey, periodPreset, previousAnalytics],
  );

  const loadingIds = useMemo(() => {
    const ids: string[] = [];
    if (employeesLoading && canAccessAttendance) ids.push('active-staff');
    if (employeesLoading && canAccessEmployees) ids.push('birthdays-week');
    if (
      canAccessAccounting &&
      (employeesLoading || loading.shifts || loading.attendance)
    ) {
      ids.push('payroll-cost');
    }
    if (loading.leaveRequests && canAccessLeave) ids.push('pending-permits');
    if ((loading.shifts || loading.attendance) && canAccessAttendance) {
      ids.push('late-alerts');
    }
    if (ops.loading && canAccessCourses) ids.push('course-review');
    if (ops.loading && canAccessIssueReports) ids.push('open-issues');
    return ids;
  }, [
    canAccessAccounting,
    canAccessAttendance,
    canAccessCourses,
    canAccessEmployees,
    canAccessIssueReports,
    canAccessLeave,
    employeesLoading,
    loading,
    ops.loading,
  ]);

  const chartsLoading = loading.shifts || loading.attendance;
  const money = (value: number) =>
    formatDashboardCurrency(value, settings.currency);

  function handleRefresh() {
    void refresh();
    void ops.refresh();
  }

  function getCategoryConfig(widgetId: string): CategoryChartConfig | null {
    switch (widgetId) {
      case 'punches-by-source':
        return {
          data: analytics.punchesBySource,
          loading: chartsLoading,
          emptyMessage: 'No punches recorded for the selected period.',
          valueLabel: 'Punches',
          valueFormatter: (value) => `${value.toLocaleString('en-AU')}`,
          defaultChartType: 'donut',
          previous: previousAnalytics?.punchesBySource,
        };
      case 'courses-status':
        return {
          data: analytics.coursesByStatus,
          loading: ops.loading,
          valueLabel: 'Enrollments',
          yAxisLabel: 'Count',
          color: '#8b5cf6',
          defaultChartType: 'bar',
        };
      case 'open-issues':
        return {
          data: analytics.openIssuesByCategory,
          loading: ops.loading,
          valueLabel: 'Open reports',
          yAxisLabel: 'Count',
          color: '#f97316',
          defaultChartType: 'bar',
          highlightExtreme: 'max',
        };
      case 'inspections-overview':
        return {
          data: analytics.inspectionsOverview,
          loading: ops.loading,
          valueLabel: 'Inspections',
          yAxisLabel: 'Count',
          color: '#06b6d4',
          defaultChartType: 'bar',
        };
      case 'payroll-by-location':
        return {
          data: analytics.payrollByLocation,
          loading: chartsLoading,
          emptyMessage: 'No payroll cost recorded for the selected period.',
          valueLabel: 'Payroll',
          valueFormatter: money,
          defaultChartType: 'donut',
          previous: previousAnalytics?.payrollByLocation,
        };
      case 'payroll-projected-by-location':
        return {
          data: analytics.projectedPayrollByLocation,
          loading: chartsLoading,
          emptyMessage: 'No scheduled shifts in the selected period.',
          valueLabel: 'Projected payroll',
          valueFormatter: money,
          defaultChartType: 'donut',
          previous: previousAnalytics?.projectedPayrollByLocation,
        };
      case 'hours-worked-by-location':
        return {
          data: analytics.hoursWorkedByLocation,
          loading: chartsLoading,
          valueLabel: 'Hours',
          yAxisLabel: 'Hours',
          valueFormatter: (value) => `${value.toFixed(1)} h`,
          defaultChartType: 'bar',
          showAverage: true,
          previous: previousAnalytics?.hoursWorkedByLocation,
        };
      case 'shift-load-department':
        return {
          data: analytics.shiftLoadByDepartment.map((item) => ({
            name: item.department,
            value: item.turnos,
          })),
          loading: chartsLoading,
          valueLabel: 'Shifts',
          yAxisLabel: 'Shifts',
          defaultChartType: 'bar',
          showAverage: true,
        };
      case 'shifts-by-location':
        return {
          data: analytics.shiftsByLocation,
          loading: chartsLoading,
          valueLabel: 'Shifts',
          yAxisLabel: 'Shifts',
          defaultChartType: 'bar',
          previous: previousAnalytics?.shiftsByLocation,
        };
      case 'late-arrivals-by-location':
        return {
          data: analytics.lateArrivalsByLocation,
          loading: chartsLoading,
          valueLabel: 'Late arrivals',
          yAxisLabel: 'Count',
          color: '#f59e0b',
          defaultChartType: 'bar',
          showAverage: true,
          highlightExtreme: 'max',
          deltaSentiment: 'lower-is-better',
          previous: previousAnalytics?.lateArrivalsByLocation,
        };
      case 'no-shows-by-location':
        return {
          data: analytics.noShowsByLocation,
          loading: chartsLoading,
          valueLabel: 'No-shows',
          yAxisLabel: 'Count',
          color: '#fb7185',
          defaultChartType: 'bar',
          showAverage: true,
          highlightExtreme: 'max',
          deltaSentiment: 'lower-is-better',
          previous: previousAnalytics?.noShowsByLocation,
        };
      case 'headcount-by-location':
        return {
          data: analytics.headcountByLocation,
          loading: employeesLoading,
          emptyMessage: 'No active employees for the selected filters.',
          valueLabel: 'Staff',
          valueFormatter: (value) => `${value} staff`,
          defaultChartType: 'donut',
        };
      case 'leave-by-type':
        return {
          data: analytics.leaveByType,
          loading: loading.leaveRequests,
          valueLabel: 'Requests',
          valueFormatter: (value) =>
            `${value} ${value === 1 ? 'request' : 'requests'}`,
          color: '#f59e0b',
          defaultChartType: 'bar',
          orientation: 'rows',
          emptyMessage: 'No pending leave requests.',
        };
      case 'attendance-compliance':
        return {
          data: analytics.attendanceComplianceByLocation,
          loading: chartsLoading,
          valueLabel: 'On-time %',
          yAxisLabel: '%',
          valueFormatter: (value) => `${value}%`,
          color: '#22c55e',
          defaultChartType: 'bar',
          showAverage: true,
          highlightExtreme: 'min',
          emptyMessage: 'No shift data for the selected period.',
        };
      default:
        return null;
    }
  }

  function getView(widgetId: string, config?: CategoryChartConfig | null): WidgetView {
    const stored = widgetViews[widgetId] ?? {};
    return {
      chartType: stored.chartType ?? config?.defaultChartType ?? 'bar',
      groupedView: stored.groupedView ?? 'grouped',
      sort: stored.sort ?? 'value',
      topN: stored.topN ?? 'all',
    };
  }

  function updateView(widgetId: string, patch: Partial<WidgetView>) {
    setWidgetViews((previous) => ({
      ...previous,
      [widgetId]: { ...previous[widgetId], ...patch },
    }));
  }

  function renderToolbar(widgetId: string) {
    const config = getCategoryConfig(widgetId);

    if (config) {
      if (config.data.length === 0) return null;
      const view = getView(widgetId, config);

      return (
        <ChartToolbar>
          <ChartToolbarGroup
            ariaLabel="Chart type"
            options={CHART_TYPE_OPTIONS}
            value={view.chartType}
            onChange={(chartType) => updateView(widgetId, { chartType })}
          />
          {view.chartType === 'bar' ? (
            <ChartToolbarGroup
              ariaLabel="Sort order"
              options={SORT_OPTIONS}
              value={view.sort}
              onChange={(sort) => updateView(widgetId, { sort })}
            />
          ) : null}
          {config.data.length > 5 ? (
            <ChartToolbarGroup
              ariaLabel="How many categories"
              options={TOP_N_OPTIONS}
              value={view.topN}
              onChange={(topN) => updateView(widgetId, { topN })}
            />
          ) : null}
        </ChartToolbar>
      );
    }

    if (widgetId === 'scheduled-vs-actual') {
      if (analytics.scheduledVsActualByLocation.length === 0) return null;
      const view = getView(widgetId);

      return (
        <ChartToolbar>
          <ChartToolbarGroup
            ariaLabel="Comparison view"
            options={GROUPED_VIEW_OPTIONS}
            value={view.groupedView}
            onChange={(groupedView) => updateView(widgetId, { groupedView })}
          />
          <ChartToolbarGroup
            ariaLabel="Sort order"
            options={SORT_OPTIONS}
            value={view.sort}
            onChange={(sort) => updateView(widgetId, { sort })}
          />
          {analytics.scheduledVsActualByLocation.length > 5 ? (
            <ChartToolbarGroup
              ariaLabel="How many locations"
              options={TOP_N_OPTIONS}
              value={view.topN}
              onChange={(topN) => updateView(widgetId, { topN })}
            />
          ) : null}
        </ChartToolbar>
      );
    }

    return null;
  }

  function renderWidget(widgetId: string) {
    const definition = DASHBOARD_WIDGET_MAP.get(widgetId);
    if (!definition) return null;

    if (widgetId === 'kpis') {
      return <KpiGrid metrics={metrics} loadingIds={loadingIds} />;
    }

    if (widgetId === 'working-now') {
      return (
        <WorkingNowWidget
          groups={workingNow.groups}
          people={workingNow.people}
          loading={workingNow.loading || employeesLoading}
          nowMs={workingNow.nowMs}
          timeZone={settings.timeZone}
          workingCount={workingNow.workingCount}
          onBreakCount={workingNow.onBreakCount}
        />
      );
    }

    if (widgetId === 'upcoming-birthdays') {
      return (
        <UpcomingBirthdaysWidget
          entries={analytics.upcomingBirthdays}
          loading={employeesLoading}
        />
      );
    }

    const config = getCategoryConfig(widgetId);
    if (config) {
      const view = getView(widgetId, config);

      return (
        <CategoryChart
          data={config.data}
          loading={config.loading}
          emptyMessage={config.emptyMessage}
          valueLabel={config.valueLabel}
          yAxisLabel={config.yAxisLabel}
          valueFormatter={config.valueFormatter}
          color={config.color}
          chartType={view.chartType}
          orientation={config.orientation}
          sort={view.sort}
          topN={view.topN}
          showAverage={config.showAverage}
          highlightExtreme={config.highlightExtreme}
          deltaSentiment={config.deltaSentiment}
          previousByKey={
            config.previous
              ? new Map(config.previous.map((item) => [item.name, item.value]))
              : undefined
          }
        />
      );
    }

    switch (widgetId) {
      case 'scheduled-vs-actual': {
        const view = getView(widgetId);
        return (
          <DashboardGroupedBarChart
            data={analytics.scheduledVsActualByLocation}
            loading={chartsLoading}
            view={view.groupedView}
            sort={view.sort}
            topN={view.topN}
          />
        );
      }
      case 'daily-payroll-trend':
        return (
          <DashboardPayrollTrendChart
            data={analytics.dailyPayrollTrend}
            currency={settings.currency}
            loading={chartsLoading}
            previousData={previousAnalytics?.dailyPayrollTrend}
          />
        );
      case 'weekly-hours':
        return (
          <DashboardWeeklyHoursAreaChart
            data={analytics.weeklyHours}
            loading={chartsLoading}
            previousData={previousAnalytics?.weeklyHours}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <DashboardFiltersBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        periodPreset={periodPreset}
        onPeriodPresetChange={setPeriodPreset}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locationOptions={locationOptions}
        onCustomize={() => setCustomizeOpen(true)}
        onResetLayout={resetLayout}
        onRefresh={handleRefresh}
        refreshing={refreshing || ops.refreshing}
        compareEnabled={compareEnabled}
        onCompareToggle={setCompareEnabled}
        compareLoading={comparison.loading}
      />

      <div className="space-y-4">
        {orderedVisibleWidgets.map((widgetId) => {
          const definition = DASHBOARD_WIDGET_MAP.get(widgetId);
          if (!definition) return null;

          const collapsed = isWidgetCollapsed(widgetId);
          const insights = buildWidgetInsights(widgetId, analytics, {
            currency: settings.currency,
            previous: previousAnalytics,
            workingNowCount: workingNow.workingCount,
            onBreakCount: workingNow.onBreakCount,
            canAccessAccounting,
          });

          return (
            <CollapsibleDashboardCard
              key={widgetId}
              title={definition.title}
              description={definition.description}
              insights={
                insights.length > 0 ? (
                  <WidgetInsightChips insights={insights} />
                ) : null
              }
              toolbar={renderToolbar(widgetId)}
              collapsed={collapsed}
              onToggle={() => toggleWidgetCollapsed(widgetId)}
            >
              {renderWidget(widgetId)}
            </CollapsibleDashboardCard>
          );
        })}
      </div>

      {orderedVisibleWidgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          No widgets selected. Use &quot;Customize widgets&quot; to add analytics cards.
        </div>
      ) : null}

      <DashboardCustomizeDialog
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        widgets={availableWidgets}
        visibleWidgets={layout.visibleWidgets}
        onToggleWidget={toggleWidgetVisibility}
        onShowAll={showAllWidgets}
        onReset={resetLayout}
      />
    </div>
  );
}
