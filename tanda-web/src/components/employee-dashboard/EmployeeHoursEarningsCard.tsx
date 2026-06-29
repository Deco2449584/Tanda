'use client';

import { useMemo, useState } from 'react';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import {
  calculateWorkedHoursInRange,
  getMonthDateRange,
  getYearDateRange,
} from '@/lib/attendance/work-sessions';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type HoursEarningsPeriod = 'week' | 'month' | 'year';

const PERIOD_OPTIONS: Array<{ id: HoursEarningsPeriod; label: string }> = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const HOUR_GOALS: Record<HoursEarningsPeriod, number> = {
  week: 40,
  month: 200,
  year: 2080,
};

interface EmployeeHoursEarningsCardProps {
  records: AttendanceRecord[];
  weekStart: string;
  weekEnd: string;
  hourlyRate: number;
  currency: string;
  loading?: boolean;
  breakSettings: AttendanceBreakSettings;
  embedded?: boolean;
  period?: HoursEarningsPeriod;
  onPeriodChange?: (period: HoursEarningsPeriod) => void;
}

function resolveRange(
  period: HoursEarningsPeriod,
  weekStart: string,
  weekEnd: string,
): { start: string; end: string } {
  if (period === 'week') {
    return { start: weekStart, end: weekEnd };
  }
  if (period === 'month') {
    return getMonthDateRange();
  }
  return getYearDateRange();
}

export function formatHoursEarningsSummary(
  hours: number,
  earnings: number,
  currency: string,
  period: HoursEarningsPeriod,
  hourlyRate: number,
): string {
  const roundedHours = Math.round(hours * 10) / 10;
  const periodLabel = period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this year';

  if (hourlyRate > 0) {
    return `${formatDashboardCurrency(earnings, currency)} · ${roundedHours} hrs ${periodLabel}`;
  }

  return `${roundedHours} hrs ${periodLabel}`;
}

export function EmployeeHoursEarningsCard({
  records,
  weekStart,
  weekEnd,
  hourlyRate,
  currency,
  loading = false,
  breakSettings,
  embedded = false,
  period: controlledPeriod,
  onPeriodChange,
}: EmployeeHoursEarningsCardProps) {
  const [internalPeriod, setInternalPeriod] = useState<HoursEarningsPeriod>('week');
  const period = controlledPeriod ?? internalPeriod;

  function setPeriod(next: HoursEarningsPeriod) {
    if (onPeriodChange) {
      onPeriodChange(next);
    } else {
      setInternalPeriod(next);
    }
  }

  const { hours, earnings, goal, progress } = useMemo(() => {
    const range = resolveRange(period, weekStart, weekEnd);
    const worked = calculateWorkedHoursInRange(
      records,
      range.start,
      range.end,
      breakSettings,
    );
    const rounded = Math.round(worked * 10) / 10;
    const gross = Math.round(rounded * hourlyRate * 100) / 100;
    const hourGoal = HOUR_GOALS[period];
    const progressPct = hourGoal > 0 ? Math.min((rounded / hourGoal) * 100, 100) : 0;

    return {
      hours: rounded,
      earnings: gross,
      goal: hourGoal,
      progress: progressPct,
    };
  }, [breakSettings, hourlyRate, period, records, weekEnd, weekStart]);

  const periodLabel =
    period === 'week' ? 'This week' : period === 'month' ? 'This month' : 'This year';

  return (
    <div className={embedded ? '' : 'rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm'}>
      {!embedded ? (
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          Hours & earnings
        </p>
      ) : null}

      <div className={`flex flex-wrap gap-1.5 ${embedded ? '' : 'mt-3'}`}>
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPeriod(option.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              period === option.id
                ? 'bg-primary text-white'
                : 'bg-surface-hover text-muted hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          {hourlyRate > 0 ? (
            <>
              <p className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                {loading ? (
                  <span className="inline-block animate-pulse text-subtle">...</span>
                ) : (
                  formatDashboardCurrency(earnings, currency)
                )}
              </p>
              <p className="mt-1 text-xs text-subtle">
                Estimated gross pay · {periodLabel.toLowerCase()}
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
              Your hourly rate is not set yet. Contact your administrator to see earnings.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border/80 bg-surface-base/40 px-3 py-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-white">
                {loading ? (
                  <span className="inline-block animate-pulse text-subtle">...</span>
                ) : (
                  `${hours} hrs`
                )}
              </p>
              <p className="mt-0.5 text-xs text-subtle">Billable hours · {periodLabel.toLowerCase()}</p>
            </div>
            {!loading ? (
              <span className="shrink-0 text-xs font-semibold text-primary">
                {Math.round(progress)}%
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-subtle">Goal {goal} hrs</p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: loading ? '0%' : `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
