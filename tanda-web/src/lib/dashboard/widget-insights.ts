import { computeDelta, type DeltaInfo, type DeltaSentiment } from './delta';
import { formatDashboardCurrency } from './format-currency';
import type { DashboardAnalytics } from './compute-analytics';
import type { NamedValueDatum } from './types';

export interface WidgetInsight {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  delta?: DeltaInfo;
  deltaSentiment?: DeltaSentiment;
  /** Format used when the delta is rendered as an absolute change. */
  deltaMode?: 'percent' | 'absolute';
}

export interface WidgetInsightOptions {
  currency: string;
  previous?: DashboardAnalytics | null;
  workingNowCount?: number;
  onBreakCount?: number;
  canAccessAccounting?: boolean;
}

function sumValues(entries: NamedValueDatum[]): number {
  return entries.reduce((sum, entry) => sum + entry.value, 0);
}

function topEntry(entries: NamedValueDatum[]): NamedValueDatum | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, entry) =>
    entry.value > best.value ? entry : best,
  );
}

function bottomEntry(entries: NamedValueDatum[]): NamedValueDatum | null {
  if (entries.length === 0) return null;
  return entries.reduce((worst, entry) =>
    entry.value < worst.value ? entry : worst,
  );
}

function formatCount(value: number): string {
  return value.toLocaleString('en-AU');
}

function formatHours(value: number): string {
  return `${value.toFixed(1)} h`;
}

function maybeDelta(
  current: number,
  previous: number | undefined,
): DeltaInfo | undefined {
  if (previous === undefined) return undefined;
  return computeDelta(current, previous);
}

export function buildWidgetInsights(
  widgetId: string,
  analytics: DashboardAnalytics,
  options: WidgetInsightOptions,
): WidgetInsight[] {
  const { currency, previous } = options;
  const money = (value: number) => formatDashboardCurrency(value, currency);

  switch (widgetId) {
    case 'kpis': {
      const insights: WidgetInsight[] = [
        { label: 'Active staff', value: analytics.activeStaffLabel },
      ];
      if (options.canAccessAccounting) {
        insights.push({
          label: 'Payroll',
          value: analytics.payrollActualFormatted,
          delta: maybeDelta(analytics.payrollTotal, previous?.payrollTotal),
          deltaSentiment: 'neutral',
        });
      }
      insights.push({
        label: 'Late arrivals',
        value: formatCount(analytics.lateAlertsTotal),
        tone: analytics.lateAlertsTotal > 0 ? 'warning' : 'positive',
        delta: maybeDelta(analytics.lateAlertsTotal, previous?.lateAlertsTotal),
        deltaSentiment: 'lower-is-better',
        deltaMode: 'absolute',
      });
      return insights;
    }

    case 'working-now':
      return [
        {
          label: 'Clocked in',
          value: formatCount(options.workingNowCount ?? 0),
          tone: 'positive',
        },
        { label: 'On break', value: formatCount(options.onBreakCount ?? 0) },
      ];

    case 'upcoming-birthdays':
      return [
        {
          label: 'This week',
          value: formatCount(analytics.birthdaysThisWeek),
        },
        {
          label: 'Next 7 days',
          value: formatCount(analytics.upcomingBirthdays.length),
        },
      ];

    case 'punches-by-source': {
      const total = sumValues(analytics.punchesBySource);
      const top = topEntry(analytics.punchesBySource);
      const manual = analytics.punchesBySource.find((entry) =>
        entry.name.toLowerCase().includes('manual'),
      );
      const insights: WidgetInsight[] = [
        {
          label: 'Total punches',
          value: formatCount(total),
          delta: maybeDelta(
            total,
            previous ? sumValues(previous.punchesBySource) : undefined,
          ),
          deltaSentiment: 'neutral',
        },
      ];
      if (top) {
        insights.push({ label: 'Top source', value: top.name });
      }
      if (manual && total > 0) {
        const share = Math.round((manual.value / total) * 1000) / 10;
        insights.push({
          label: 'Manual share',
          value: `${share}%`,
          tone: share > 25 ? 'warning' : 'default',
        });
      }
      return insights;
    }

    case 'courses-status':
      return [
        {
          label: 'Enrollments',
          value: formatCount(sumValues(analytics.coursesByStatus)),
        },
        {
          label: 'Awaiting review',
          value: formatCount(analytics.coursesAwaitingReview),
          tone: analytics.coursesAwaitingReview > 0 ? 'warning' : 'positive',
        },
        {
          label: 'Overdue',
          value: formatCount(analytics.coursesOverdue),
          tone: analytics.coursesOverdue > 0 ? 'negative' : 'positive',
        },
      ];

    case 'open-issues': {
      const top = topEntry(analytics.openIssuesByCategory);
      return [
        {
          label: 'Open reports',
          value: formatCount(analytics.openIssuesTotal),
          tone: analytics.openIssuesTotal > 0 ? 'warning' : 'positive',
        },
        {
          label: 'Top category',
          value: top ? `${top.name} (${formatCount(top.value)})` : 'None',
        },
      ];
    }

    case 'inspections-overview':
      return [
        {
          label: 'Inspections',
          value: formatCount(sumValues(analytics.inspectionsOverview)),
        },
        {
          label: 'With issues',
          value: formatCount(analytics.inspectionsWithIssues),
          tone: analytics.inspectionsWithIssues > 0 ? 'warning' : 'positive',
        },
      ];

    case 'payroll-by-location': {
      const top = topEntry(analytics.payrollByLocation);
      return [
        {
          label: 'Actual cost',
          value: money(analytics.payrollTotal),
          delta: maybeDelta(analytics.payrollTotal, previous?.payrollTotal),
          deltaSentiment: 'neutral',
        },
        {
          label: 'Top site',
          value: top ? `${top.name} · ${money(top.value)}` : 'No data',
        },
        {
          label: 'Sites',
          value: formatCount(analytics.payrollByLocation.length),
        },
      ];
    }

    case 'payroll-projected-by-location': {
      const top = topEntry(analytics.projectedPayrollByLocation);
      const variance = analytics.payrollTotal - analytics.projectedPayrollTotal;
      return [
        {
          label: 'Projected',
          value: money(analytics.projectedPayrollTotal),
        },
        {
          label: 'Top site',
          value: top ? `${top.name} · ${money(top.value)}` : 'No data',
        },
        {
          label: 'Actual vs projected',
          value: `${variance > 0 ? '+' : ''}${money(variance)}`,
          tone: variance > 0 ? 'negative' : 'positive',
        },
      ];
    }

    case 'hours-worked-by-location': {
      const total = sumValues(analytics.hoursWorkedByLocation);
      const top = topEntry(analytics.hoursWorkedByLocation);
      const siteCount = analytics.hoursWorkedByLocation.length;
      return [
        {
          label: 'Total hours',
          value: formatHours(total),
          delta: maybeDelta(
            total,
            previous ? sumValues(previous.hoursWorkedByLocation) : undefined,
          ),
          deltaSentiment: 'neutral',
        },
        {
          label: 'Top site',
          value: top ? `${top.name} · ${formatHours(top.value)}` : 'No data',
        },
        {
          label: 'Average per site',
          value: siteCount > 0 ? formatHours(total / siteCount) : '0.0 h',
        },
      ];
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
      const variance = Math.round((actual - scheduled) * 10) / 10;
      return [
        { label: 'Scheduled', value: formatHours(scheduled) },
        { label: 'Actual', value: formatHours(actual) },
        {
          label: 'Variance',
          value: `${variance > 0 ? '+' : ''}${formatHours(variance)}`,
          tone: Math.abs(variance) < 1 ? 'positive' : variance > 0 ? 'negative' : 'warning',
        },
      ];
    }

    case 'daily-payroll-trend': {
      const days = analytics.dailyPayrollTrend;
      const total = sumValues(days);
      const peak = topEntry(days);
      return [
        {
          label: 'Period total',
          value: money(total),
          delta: maybeDelta(total, previous?.payrollTotal),
          deltaSentiment: 'neutral',
        },
        {
          label: 'Daily average',
          value: days.length > 0 ? money(total / days.length) : money(0),
        },
        {
          label: 'Peak day',
          value: peak ? `${peak.name} · ${money(peak.value)}` : 'No data',
        },
      ];
    }

    case 'weekly-hours': {
      const total = analytics.weeklyHours.reduce(
        (sum, item) => sum + item.horas,
        0,
      );
      const peak = analytics.weeklyHours.reduce(
        (best, item) => (item.horas > best.horas ? item : best),
        { day: '', horas: 0 },
      );
      return [
        {
          label: 'Scheduled hours',
          value: formatHours(total),
          delta: maybeDelta(
            total,
            previous
              ? previous.weeklyHours.reduce((sum, item) => sum + item.horas, 0)
              : undefined,
          ),
          deltaSentiment: 'neutral',
        },
        {
          label: 'Daily average',
          value:
            analytics.weeklyHours.length > 0
              ? formatHours(total / analytics.weeklyHours.length)
              : '0.0 h',
        },
        {
          label: 'Busiest day',
          value: peak.horas > 0 ? `${peak.day} · ${formatHours(peak.horas)}` : 'No data',
        },
      ];
    }

    case 'shift-load-department': {
      const total = analytics.shiftLoadByDepartment.reduce(
        (sum, item) => sum + item.turnos,
        0,
      );
      const top = analytics.shiftLoadByDepartment.reduce(
        (best, item) => (item.turnos > best.turnos ? item : best),
        { department: '', turnos: 0 },
      );
      return [
        { label: 'Shifts', value: formatCount(total) },
        {
          label: 'Busiest department',
          value:
            top.turnos > 0
              ? `${top.department} (${formatCount(top.turnos)})`
              : 'No data',
        },
      ];
    }

    case 'shifts-by-location': {
      const total = sumValues(analytics.shiftsByLocation);
      const top = topEntry(analytics.shiftsByLocation);
      return [
        {
          label: 'Shifts',
          value: formatCount(total),
          delta: maybeDelta(
            total,
            previous ? sumValues(previous.shiftsByLocation) : undefined,
          ),
          deltaSentiment: 'neutral',
          deltaMode: 'absolute',
        },
        {
          label: 'Top site',
          value: top ? `${top.name} (${formatCount(top.value)})` : 'No data',
        },
      ];
    }

    case 'late-arrivals-by-location': {
      const worst = topEntry(analytics.lateArrivalsByLocation);
      return [
        {
          label: 'Late arrivals',
          value: formatCount(analytics.lateAlertsTotal),
          tone: analytics.lateAlertsTotal > 0 ? 'warning' : 'positive',
          delta: maybeDelta(analytics.lateAlertsTotal, previous?.lateAlertsTotal),
          deltaSentiment: 'lower-is-better',
          deltaMode: 'absolute',
        },
        {
          label: 'Worst site',
          value: worst ? `${worst.name} (${formatCount(worst.value)})` : 'None',
          tone: worst ? 'negative' : 'positive',
        },
      ];
    }

    case 'no-shows-by-location': {
      const worst = topEntry(analytics.noShowsByLocation);
      return [
        {
          label: 'No-shows',
          value: formatCount(analytics.noShowsTotal),
          tone: analytics.noShowsTotal > 0 ? 'negative' : 'positive',
          delta: maybeDelta(analytics.noShowsTotal, previous?.noShowsTotal),
          deltaSentiment: 'lower-is-better',
          deltaMode: 'absolute',
        },
        {
          label: 'Worst site',
          value: worst ? `${worst.name} (${formatCount(worst.value)})` : 'None',
          tone: worst ? 'negative' : 'positive',
        },
        {
          label: 'Sites affected',
          value: formatCount(analytics.noShowsByLocation.length),
        },
      ];
    }

    case 'headcount-by-location': {
      const total = sumValues(analytics.headcountByLocation);
      const top = topEntry(analytics.headcountByLocation);
      return [
        { label: 'Active staff', value: formatCount(total) },
        {
          label: 'Largest site',
          value: top ? `${top.name} (${formatCount(top.value)})` : 'No data',
        },
        { label: 'Sites', value: formatCount(analytics.headcountByLocation.length) },
      ];
    }

    case 'leave-by-type': {
      const top = topEntry(analytics.leaveByType);
      return [
        {
          label: 'Pending requests',
          value: formatCount(analytics.pendingLeaveTotal),
          tone: analytics.pendingLeaveTotal > 0 ? 'warning' : 'positive',
        },
        {
          label: 'Most requested',
          value: top ? `${top.name} (${formatCount(top.value)})` : 'None',
        },
      ];
    }

    case 'attendance-compliance': {
      const entries = analytics.attendanceComplianceByLocation;
      const best = topEntry(entries);
      const worst = bottomEntry(entries);
      const average =
        entries.length > 0
          ? Math.round((sumValues(entries) / entries.length) * 10) / 10
          : 0;
      return [
        {
          label: 'Average on-time',
          value: `${average}%`,
          tone: average >= 90 ? 'positive' : average >= 75 ? 'warning' : 'negative',
        },
        {
          label: 'Best site',
          value: best ? `${best.name} (${best.value}%)` : 'No data',
          tone: 'positive',
        },
        {
          label: 'Needs attention',
          value: worst ? `${worst.name} (${worst.value}%)` : 'No data',
          tone: worst && worst.value < 90 ? 'negative' : 'default',
        },
      ];
    }

    default:
      return [];
  }
}
