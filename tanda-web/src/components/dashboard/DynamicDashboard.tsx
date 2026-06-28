'use client';

import { useMemo, useState } from 'react';
import { CollapsibleDashboardCard } from '@/components/dashboard/CollapsibleDashboardCard';
import { DashboardCustomizeDialog } from '@/components/dashboard/DashboardCustomizeDialog';
import {
  DashboardFiltersBar,
  type DashboardPeriodPreset,
} from '@/components/dashboard/DashboardFiltersBar';
import { DashboardBarChart } from '@/components/dashboard/charts/DashboardBarChart';
import {
  DashboardPayrollTrendChart,
  DashboardWeeklyHoursAreaChart,
} from '@/components/dashboard/charts/DashboardAreaChart';
import { DashboardGroupedBarChart } from '@/components/dashboard/charts/DashboardGroupedBarChart';
import { DashboardCurrencyPieChart, DashboardPieChart } from '@/components/dashboard/charts/DashboardPieChart';
import { COLOR_HORAS_EXTRA_FALLBACK } from '@/components/dashboard/chart-theme';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import {
  getCurrentWeekDateRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { computeDashboardAnalytics } from '@/lib/dashboard/compute-analytics';
import { DASHBOARD_WIDGET_MAP } from '@/lib/dashboard/dashboard-widgets';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { baseKpiMetrics } from '@/lib/dashboard/kpi-definitions';
import type { DashboardAnalytics } from '@/lib/dashboard/compute-analytics';
import type { KpiMetric } from '@/lib/dashboard/types';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';

function formatTopSlice(
  data: Array<{ name: string; value: number }>,
  formatter: (value: number) => string,
): string {
  if (data.length === 0) return 'No data';
  const top = data[0];
  return `${top.name}: ${formatter(top.value)}`;
}

function getWidgetSummary(
  widgetId: string,
  analytics: DashboardAnalytics,
  currency: string,
): string {
  switch (widgetId) {
    case 'kpis':
      return `${analytics.activeStaffLabel} active · ${analytics.payrollActualFormatted} payroll`;
    case 'payroll-by-location':
      return formatTopSlice(analytics.payrollByLocation, (v) =>
        formatDashboardCurrency(v, currency),
      );
    case 'payroll-projected-by-location':
      return formatTopSlice(analytics.projectedPayrollByLocation, (v) =>
        formatDashboardCurrency(v, currency),
      );
    case 'hours-worked-by-location': {
      const total = analytics.hoursWorkedByLocation.reduce(
        (sum, item) => sum + item.value,
        0,
      );
      return `${total.toFixed(1)} h total`;
    }
    case 'scheduled-vs-actual': {
      const scheduled = analytics.scheduledVsActualByLocation.reduce(
        (sum, item) => sum + item.scheduled,
        0,
      );
      const actual = analytics.scheduledVsActualByLocation.reduce(
        (sum, item) => sum + item.actual,
        0,
      );
      return `${scheduled.toFixed(1)} h scheduled · ${actual.toFixed(1)} h actual`;
    }
    case 'daily-payroll-trend':
      return `${analytics.payrollActualFormatted} in period`;
    case 'weekly-hours': {
      const total = analytics.weeklyHours.reduce((sum, item) => sum + item.horas, 0);
      return `${total.toFixed(1)} h scheduled`;
    }
    case 'shift-load-department':
      return `${analytics.shiftLoadByDepartment.reduce((sum, item) => sum + item.turnos, 0)} shifts`;
    case 'shifts-by-location':
      return `${analytics.shiftsByLocation.reduce((sum, item) => sum + item.value, 0)} shifts`;
    case 'late-arrivals-by-location':
      return `${analytics.lateAlertsTotal} late arrivals`;
    case 'no-shows-by-location':
      return `${analytics.noShowsTotal} no-shows`;
    case 'headcount-by-location':
      return `${analytics.headcountByLocation.reduce((sum, item) => sum + item.value, 0)} employees`;
    case 'leave-by-type':
      return `${analytics.pendingLeaveTotal} pending requests`;
    case 'attendance-compliance':
      return analytics.attendanceComplianceByLocation.length > 0
        ? `Best: ${analytics.attendanceComplianceByLocation[0].name} (${analytics.attendanceComplianceByLocation[0].value}%)`
        : 'No shift data';
    default:
      return '';
  }
}

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

  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [periodPreset, setPeriodPreset] =
    useState<DashboardPeriodPreset>('this_week');
  const [locationFilter, setLocationFilter] = useState('all');
  const [customizeOpen, setCustomizeOpen] = useState(false);

  const {
    orderedVisibleWidgets,
    toggleWidgetVisibility,
    toggleWidgetCollapsed,
    isWidgetCollapsed,
    resetLayout,
    showAllWidgets,
    layout,
  } = useDashboardLayout();

  const { shifts, leaveRequests, attendance, loading } =
    useDashboardData(dateRange);

  const analytics = useMemo(
    () =>
      computeDashboardAnalytics({
        employees,
        shifts,
        attendance,
        leaveRequests,
        locations,
        groups,
        dateRange,
        locationFilter,
        attendanceBreak: settings.attendanceBreak,
        attendancePolicy: settings.attendancePolicy,
        timeZone: settings.timeZone,
        currency: settings.currency,
      }),
    [
      attendance,
      dateRange,
      employees,
      groups,
      leaveRequests,
      locationFilter,
      locations,
      settings.attendanceBreak,
      settings.attendancePolicy,
      settings.currency,
      settings.timeZone,
      shifts,
    ],
  );

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
      baseKpiMetrics.map((metric) => {
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
          };
        }

        if (metric.id === 'late-alerts') {
          return {
            ...metric,
            value: String(analytics.lateAlertsTotal),
          };
        }

        if (metric.id === 'pending-permits') {
          return {
            ...metric,
            value: String(analytics.pendingLeaveTotal),
          };
        }

        return metric;
      }),
    [analytics, periodPreset],
  );

  const loadingIds = useMemo(() => {
    const ids: string[] = [];
    if (employeesLoading) ids.push('active-staff');
    if (employeesLoading || loading.shifts || loading.attendance) {
      ids.push('payroll-cost');
    }
    if (loading.leaveRequests) ids.push('pending-permits');
    if (loading.shifts || loading.attendance) ids.push('late-alerts');
    return ids;
  }, [employeesLoading, loading]);

  const chartsLoading = loading.shifts || loading.attendance;

  function renderWidget(widgetId: string) {
    const definition = DASHBOARD_WIDGET_MAP.get(widgetId);
    if (!definition) return null;

    if (widgetId === 'kpis') {
      return <KpiGrid metrics={metrics} loadingIds={loadingIds} />;
    }

    switch (widgetId) {
      case 'payroll-by-location':
        return (
          <DashboardCurrencyPieChart
            data={analytics.payrollByLocation}
            currency={settings.currency}
            loading={chartsLoading}
            emptyMessage="No payroll cost recorded for the selected period."
          />
        );
      case 'payroll-projected-by-location':
        return (
          <DashboardCurrencyPieChart
            data={analytics.projectedPayrollByLocation}
            currency={settings.currency}
            loading={chartsLoading}
            emptyMessage="No scheduled shifts in the selected period."
          />
        );
      case 'hours-worked-by-location':
        return (
          <DashboardBarChart
            data={analytics.hoursWorkedByLocation}
            loading={chartsLoading}
            valueLabel="Hours"
            yAxisLabel="Hours"
            valueFormatter={(value) => `${value.toFixed(1)} h`}
          />
        );
      case 'scheduled-vs-actual':
        return (
          <DashboardGroupedBarChart
            data={analytics.scheduledVsActualByLocation}
            loading={chartsLoading}
          />
        );
      case 'daily-payroll-trend':
        return (
          <DashboardPayrollTrendChart
            data={analytics.dailyPayrollTrend}
            currency={settings.currency}
            loading={chartsLoading}
          />
        );
      case 'weekly-hours':
        return (
          <DashboardWeeklyHoursAreaChart
            data={analytics.weeklyHours}
            loading={chartsLoading}
          />
        );
      case 'shift-load-department':
        return (
          <DashboardBarChart
            data={analytics.shiftLoadByDepartment.map((item) => ({
              name: item.department,
              value: item.turnos,
            }))}
            loading={chartsLoading}
            valueLabel="Shifts"
            yAxisLabel="Shifts"
          />
        );
      case 'shifts-by-location':
        return (
          <DashboardBarChart
            data={analytics.shiftsByLocation}
            loading={chartsLoading}
            valueLabel="Shifts"
            yAxisLabel="Shifts"
          />
        );
      case 'late-arrivals-by-location':
        return (
          <DashboardBarChart
            data={analytics.lateArrivalsByLocation}
            loading={chartsLoading}
            valueLabel="Late arrivals"
            yAxisLabel="Count"
            color={COLOR_HORAS_EXTRA_FALLBACK}
          />
        );
      case 'no-shows-by-location':
        return (
          <DashboardBarChart
            data={analytics.noShowsByLocation}
            loading={chartsLoading}
            valueLabel="No-shows"
            yAxisLabel="Count"
            color="#fb7185"
          />
        );
      case 'headcount-by-location':
        return (
          <DashboardPieChart
            data={analytics.headcountByLocation}
            loading={employeesLoading}
            emptyMessage="No active employees for the selected filters."
            valueFormatter={(value) => `${value} staff`}
          />
        );
      case 'leave-by-type':
        return (
          <DashboardBarChart
            data={analytics.leaveByType}
            loading={loading.leaveRequests}
            valueLabel="Requests"
            yAxisLabel="Count"
            color="#facc15"
          />
        );
      case 'attendance-compliance':
        return (
          <DashboardBarChart
            data={analytics.attendanceComplianceByLocation}
            loading={chartsLoading}
            valueLabel="On-time %"
            yAxisLabel="%"
            valueFormatter={(value) => `${value}%`}
            color="#22c55e"
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
        onDateRangeChange={(range) => {
          setDateRange(range);
          setPeriodPreset('custom');
        }}
        periodPreset={periodPreset}
        onPeriodPresetChange={setPeriodPreset}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locationOptions={locationOptions}
        onCustomize={() => setCustomizeOpen(true)}
        onResetLayout={resetLayout}
      />

      <div className="space-y-4">
        {orderedVisibleWidgets.map((widgetId) => {
          const definition = DASHBOARD_WIDGET_MAP.get(widgetId);
          if (!definition) return null;

          const collapsed = isWidgetCollapsed(widgetId);

          return (
            <CollapsibleDashboardCard
              key={widgetId}
              title={definition.title}
              description={definition.description}
              summary={getWidgetSummary(widgetId, analytics, settings.currency)}
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
        visibleWidgets={layout.visibleWidgets}
        onToggleWidget={toggleWidgetVisibility}
        onShowAll={showAllWidgets}
        onReset={resetLayout}
      />
    </div>
  );
}
