import type { PayRules, PayTimeBand } from '@/lib/types/pay-rules';

function hhmmToMinutes(value: string): number {
  if (value === '24:00' || value === '24:00:00') return 24 * 60;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function bandMinuteRanges(band: PayTimeBand): Array<[number, number]> {
  const from = hhmmToMinutes(band.from);
  const to = hhmmToMinutes(band.to);
  if (from === to) return [];
  if (from < to) return [[from, to]];
  return [
    [from, 24 * 60],
    [0, to],
  ];
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

export function validatePayRules(rules: PayRules): string[] {
  const errors: string[] = [];

  for (let i = 0; i < rules.timeBands.length; i += 1) {
    const left = rules.timeBands[i]!;
    const leftRanges = bandMinuteRanges(left);
    if (leftRanges.length === 0) {
      errors.push(`Time band “${left.name}” has the same start and end, so it never applies.`);
    }
    for (let j = i + 1; j < rules.timeBands.length; j += 1) {
      const right = rules.timeBands[j]!;
      const rightRanges = bandMinuteRanges(right);
      const overlap = leftRanges.some((a) => rightRanges.some((b) => rangesOverlap(a, b)));
      if (overlap) {
        errors.push(
          `Time bands “${left.name}” and “${right.name}” overlap. Adjust the times so each hour belongs to one band.`,
        );
      }
    }
  }

  const covered = new Set<number>();
  for (const dayType of rules.dayTypes) {
    if (dayType.publicHoliday) continue;
    for (const weekday of dayType.weekdays ?? []) {
      covered.add(weekday);
    }
  }
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const missing = [1, 2, 3, 4, 5, 6, 0].filter((day) => !covered.has(day));
  if (missing.length > 0) {
    errors.push(
      `These weekdays are not covered by a day type: ${missing.map((day) => weekdayNames[day]).join(', ')}.`,
    );
  }

  return errors;
}
