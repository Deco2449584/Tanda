import { offsetInputDate } from '@/lib/dates/input-date';
import { getMonthDateRange } from '@/lib/attendance/work-sessions';

export type HoursEarningsPeriod = 'week' | 'lastWeek' | 'month';

export const DEFAULT_WEEKLY_HOURS_GOAL = 40;
export const DEFAULT_MONTHLY_HOURS_GOAL = 160;

export function resolveHoursEarningsRange(
  period: HoursEarningsPeriod,
  weekStart: string,
  weekEnd: string,
): { start: string; end: string } {
  if (period === 'week') {
    return { start: weekStart, end: weekEnd };
  }
  if (period === 'lastWeek') {
    return {
      start: offsetInputDate(weekStart, -7),
      end: offsetInputDate(weekEnd, -7),
    };
  }
  return getMonthDateRange();
}

export function resolveHoursGoal(
  period: HoursEarningsPeriod,
  weeklyGoal?: number | null,
  monthlyGoal?: number | null,
): number {
  if (period === 'month') {
    return (
      (typeof monthlyGoal === 'number' && monthlyGoal > 0
        ? monthlyGoal
        : DEFAULT_MONTHLY_HOURS_GOAL)
    );
  }
  return (
    typeof weeklyGoal === 'number' && weeklyGoal > 0
      ? weeklyGoal
      : DEFAULT_WEEKLY_HOURS_GOAL
  );
}

export function hoursPeriodLabel(period: HoursEarningsPeriod): string {
  switch (period) {
    case 'lastWeek':
      return 'Last week';
    case 'month':
      return 'This month';
    default:
      return 'This week';
  }
}
