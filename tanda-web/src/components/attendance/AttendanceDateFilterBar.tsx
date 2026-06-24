'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import type { DateRange } from '@/lib/attendance/date-range';
import { buildWeekRange, shiftWeek } from '@/lib/schedule/week';

interface AttendanceDateFilterBarProps {
  dateRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

function shiftRangeByWeek(range: DateRange, direction: -1 | 1): DateRange {
  const reference = new Date(`${range.start}T12:00:00`);
  const week = buildWeekRange(shiftWeek(reference, direction));
  return { start: week.start, end: week.end };
}

export function AttendanceDateFilterBar({
  dateRange,
  onRangeChange,
}: AttendanceDateFilterBarProps) {
  return (
    <DateRangePicker
      value={dateRange}
      onChange={onRangeChange}
      onStepWeek={(direction) =>
        onRangeChange(shiftRangeByWeek(dateRange, direction))
      }
    />
  );
}
