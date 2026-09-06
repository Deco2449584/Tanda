'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import {
  hoursPeriodLabel,
  resolveHoursEarningsRange,
  resolveHoursGoal,
  type HoursEarningsPeriod,
} from '@/lib/employee-dashboard/hours-earnings-period';
import { saveEmployeeHoursGoalsRequest } from '@/lib/employees/employee-profile-api';
import { computeAwardPay } from '@/lib/payroll/compute-award-pay';
import type { AttendanceBreakSettings, PayrollAccountingSettings } from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';
import type { Shift } from '@/lib/types/shift';

export type { HoursEarningsPeriod };

const PERIOD_OPTIONS: Array<{ id: HoursEarningsPeriod; label: string }> = [
  { id: 'week', label: 'This week' },
  { id: 'lastWeek', label: 'Last week' },
  { id: 'month', label: 'This month' },
];

interface EmployeeHoursEarningsCardProps {
  records: AttendanceRecord[];
  employee: Employee;
  locations: Location[];
  shifts: Shift[];
  weekStart: string;
  weekEnd: string;
  hourlyRate: number;
  currency: string;
  loading?: boolean;
  breakSettings: AttendanceBreakSettings;
  timeZone: string;
  payRules?: PayRules;
  payrollAccounting?: PayrollAccountingSettings;
  embedded?: boolean;
  period?: HoursEarningsPeriod;
  onPeriodChange?: (period: HoursEarningsPeriod) => void;
  onGoalSaved?: () => void;
}

export function formatHoursEarningsSummary(
  hours: number,
  earnings: number,
  currency: string,
  period: HoursEarningsPeriod,
  hourlyRate: number,
): string {
  const roundedHours = Math.round(hours * 10) / 10;
  const periodLabel = hoursPeriodLabel(period).toLowerCase();

  if (hourlyRate > 0) {
    return `${formatDashboardCurrency(earnings, currency)} · ${roundedHours} hrs ${periodLabel}`;
  }

  return `${roundedHours} hrs ${periodLabel}`;
}

export function EmployeeHoursEarningsCard({
  records,
  employee,
  locations,
  shifts,
  weekStart,
  weekEnd,
  hourlyRate,
  currency,
  loading = false,
  breakSettings,
  timeZone,
  payRules,
  payrollAccounting,
  embedded = false,
  period: controlledPeriod,
  onPeriodChange,
  onGoalSaved,
}: EmployeeHoursEarningsCardProps) {
  const [internalPeriod, setInternalPeriod] = useState<HoursEarningsPeriod>('week');
  const period = controlledPeriod ?? internalPeriod;
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState('');

  function setPeriod(next: HoursEarningsPeriod) {
    if (onPeriodChange) {
      onPeriodChange(next);
    } else {
      setInternalPeriod(next);
    }
    setEditingGoal(false);
    setGoalError('');
  }

  const goal = resolveHoursGoal(
    period,
    employee.weeklyHoursGoal,
    employee.monthlyHoursGoal,
  );

  useEffect(() => {
    if (!editingGoal) {
      setGoalDraft(String(goal));
    }
  }, [editingGoal, goal]);

  const { hours, earnings, progress } = useMemo(() => {
    const range = resolveHoursEarningsRange(period, weekStart, weekEnd);
    const award = computeAwardPay({
      employees: [employee],
      records,
      locations,
      shifts,
      dateRange: range,
      payRules,
      payrollAccounting,
      timeZone,
      attendanceBreak: breakSettings,
    });
    const rounded = Math.round(award.payHours * 10) / 10;
    const progressPct = goal > 0 ? Math.min((rounded / goal) * 100, 100) : 0;

    return {
      hours: rounded,
      earnings: Math.round(award.payAmount * 100) / 100,
      progress: progressPct,
    };
  }, [
    breakSettings,
    employee,
    goal,
    locations,
    payRules,
    payrollAccounting,
    period,
    records,
    shifts,
    timeZone,
    weekEnd,
    weekStart,
  ]);

  const periodLabel = hoursPeriodLabel(period);

  async function handleSaveGoal() {
    const parsed = Number(goalDraft);
    if (!Number.isInteger(parsed)) {
      setGoalError('Enter a whole number of hours.');
      return;
    }

    setGoalBusy(true);
    setGoalError('');
    try {
      if (period === 'month') {
        await saveEmployeeHoursGoalsRequest({ monthlyHoursGoal: parsed });
      } else {
        await saveEmployeeHoursGoalsRequest({ weeklyHoursGoal: parsed });
      }
      setEditingGoal(false);
      onGoalSaved?.();
    } catch (error) {
      setGoalError(
        error instanceof Error ? error.message : 'Could not save hours goal.',
      );
    } finally {
      setGoalBusy(false);
    }
  }

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
                Estimated gross pay using company award rules · {periodLabel.toLowerCase()}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              Earnings will appear here once your hourly rate is set by an administrator.
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

          {editingGoal ? (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] text-subtle" htmlFor="hours-goal-input">
                {period === 'month' ? 'Monthly hours goal' : 'Weekly hours goal'}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="hours-goal-input"
                  type="number"
                  min={1}
                  max={period === 'month' ? 400 : 80}
                  step={1}
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value)}
                  disabled={goalBusy}
                  className="w-24 rounded-lg border border-border bg-surface-base px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveGoal()}
                  disabled={goalBusy}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {goalBusy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingGoal(false);
                    setGoalError('');
                    setGoalDraft(String(goal));
                  }}
                  disabled={goalBusy}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
              {goalError ? (
                <p className="text-[11px] text-red-400" role="alert">
                  {goalError}
                </p>
              ) : (
                <p className="text-[11px] text-subtle">
                  {period === 'month'
                    ? 'Used for this month progress.'
                    : 'Used for this week and last week progress.'}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingGoal(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-subtle transition-colors hover:text-foreground"
            >
              Goal {goal} hrs
              <Pencil className="h-3 w-3" aria-hidden />
              <span className="sr-only">Edit hours goal</span>
            </button>
          )}

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
