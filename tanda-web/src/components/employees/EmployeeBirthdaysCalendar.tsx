'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Cake,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import {
  MONTH_LABELS,
  MONTH_SHORT_LABELS,
  buildBirthdayEntries,
  daysUntilBirthday,
  getUpcomingBirthdays,
  groupBirthdaysByMonth,
  type BirthdayEntry,
} from '@/lib/employees/birthdays';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Employee } from '@/lib/types/employee';

interface EmployeeBirthdaysCalendarProps {
  employees: readonly Employee[];
  loading?: boolean;
  canOpenEmployee?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function Avatar({
  entry,
  size = 'md',
}: {
  entry: BirthdayEntry;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg' ? 'h-12 w-12 text-sm' : size === 'sm' ? 'h-7 w-7 text-[9px]' : 'h-9 w-9 text-[10px]';

  if (entry.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.photoUrl}
        alt=""
        className={cn('rounded-full object-cover ring-2 ring-surface-raised', sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/20 font-semibold text-primary ring-2 ring-surface-raised',
        sizeClass,
      )}
    >
      {initials(entry.name)}
    </div>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Monday-first weekday index for the 1st of the month (0 = Mon … 6 = Sun). */
function leadingEmptyCells(year: number, month: number): number {
  const weekday = new Date(year, month - 1, 1).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function MonthCard({
  year,
  month,
  entries,
  selected,
  onSelect,
  isCurrentMonth,
}: {
  year: number;
  month: number;
  entries: BirthdayEntry[];
  selected: boolean;
  onSelect: () => void;
  isCurrentMonth: boolean;
}) {
  const byDay = useMemo(() => {
    const map = new Map<number, BirthdayEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.day) ?? [];
      list.push(entry);
      map.set(entry.day, list);
    }
    return map;
  }, [entries]);

  const totalDays = daysInMonth(year, month);
  const pad = leadingEmptyCells(year, month);
  const density = Math.min(1, entries.length / 6);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border text-left transition duration-300',
        selected
          ? 'border-primary/50 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(245,30,160,0.25)]'
          : 'border-border bg-surface-raised/50 hover:border-primary/30 hover:bg-surface-hover/40',
        isCurrentMonth && !selected ? 'ring-1 ring-primary/20' : '',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-70"
        style={{
          background: `radial-gradient(120% 80% at 50% -20%, rgba(245,30,160,${0.08 + density * 0.18}) 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="relative flex items-center justify-between gap-2 px-3.5 pb-2 pt-3.5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
            {MONTH_SHORT_LABELS[month - 1]}
          </p>
          <p className="text-sm font-semibold text-foreground">{MONTH_LABELS[month - 1]}</p>
        </div>
        <span
          className={cn(
            'inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
            entries.length > 0
              ? 'bg-primary/20 text-primary'
              : 'bg-surface-overlay text-subtle',
          )}
        >
          {entries.length}
        </span>
      </div>

      <div className="relative grid grid-cols-7 gap-0.5 px-2.5 pb-1 text-[9px] font-medium uppercase tracking-wide text-subtle">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <span key={`${label}-${index}`} className="text-center">
            {label}
          </span>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-0.5 px-2.5 pb-3">
        {Array.from({ length: pad }).map((_, index) => (
          <span key={`pad-${index}`} className="aspect-square" />
        ))}
        {Array.from({ length: totalDays }).map((_, index) => {
          const day = index + 1;
          const dayEntries = byDay.get(day) ?? [];
          const hasBirthday = dayEntries.length > 0;

          return (
            <span
              key={day}
              title={
                hasBirthday
                  ? dayEntries.map((entry) => entry.name).join(', ')
                  : undefined
              }
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-md text-[10px] tabular-nums transition',
                hasBirthday
                  ? 'bg-primary text-white font-semibold shadow-sm shadow-primary/30'
                  : 'text-muted/80',
              )}
            >
              {day}
              {dayEntries.length > 1 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-foreground px-0.5 text-[7px] font-bold text-surface-base">
                  {dayEntries.length}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </button>
  );
}

function UpcomingCard({
  entry,
  canOpenEmployee,
}: {
  entry: BirthdayEntry;
  canOpenEmployee: boolean;
}) {
  const days = daysUntilBirthday(entry);
  const when =
    days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;

  const content = (
    <>
      <Avatar entry={entry} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
        <p className="truncate text-xs text-muted">
          {MONTH_SHORT_LABELS[entry.month - 1]} {entry.day}
          {entry.department ? ` · ${entry.department}` : ''}
          {` · turns ${entry.ageTurning}`}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
          days === 0
            ? 'bg-primary text-white'
            : days <= 7
              ? 'bg-primary/20 text-primary'
              : 'bg-surface-overlay text-muted',
        )}
      >
        {when}
      </span>
    </>
  );

  if (canOpenEmployee) {
    return (
      <Link
        href={`/employees/${entry.employeeDocId}/edit`}
        className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-border hover:bg-surface-hover/50"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex items-center gap-3 px-2 py-2.5">{content}</div>;
}

export function EmployeeBirthdaysCalendar({
  employees,
  loading = false,
  canOpenEmployee = false,
}: EmployeeBirthdaysCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [activeOnly, setActiveOnly] = useState(true);

  const entries = useMemo(
    () => buildBirthdayEntries(employees, year, { activeOnly }),
    [employees, year, activeOnly],
  );
  const currentYearEntries = useMemo(
    () => buildBirthdayEntries(employees, now.getFullYear(), { activeOnly }),
    [employees, now, activeOnly],
  );
  const byMonth = useMemo(() => groupBirthdaysByMonth(entries), [entries]);
  const currentByMonth = useMemo(
    () => groupBirthdaysByMonth(currentYearEntries),
    [currentYearEntries],
  );
  const upcoming = useMemo(
    () => getUpcomingBirthdays(currentYearEntries, now, 8),
    [currentYearEntries, now],
  );
  const selectedEntries = byMonth.get(selectedMonth) ?? [];

  const thisMonthCount = currentByMonth.get(now.getMonth() + 1)?.length ?? 0;
  const todayCount = currentYearEntries.filter(
    (entry) =>
      entry.month === now.getMonth() + 1 && entry.day === now.getDate(),
  ).length;

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-5 md:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Birthday atlas
            </div>
            <h2 className="mt-3 font-display text-2xl font-normal tracking-wide text-foreground md:text-3xl">
              Staff birthdays {year}
            </h2>
            <p className="mt-2 text-sm text-muted">
              A year-round view of every recorded date of birth — plan celebrations,
              spot today&apos;s birthdays, and jump to any month.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-border bg-surface-base/60 p-1">
              <button
                type="button"
                onClick={() => setYear((current) => current - 1)}
                className="rounded-lg p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
                aria-label="Previous year"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-foreground">
                {year}
              </span>
              <button
                type="button"
                onClick={() => setYear((current) => current + 1)}
                className="rounded-lg p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
                aria-label="Next year"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
              }}
              className="rounded-xl border border-border bg-surface-base/60 px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              This year
            </button>

            <button
              type="button"
              onClick={() => setActiveOnly((value) => !value)}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                activeOnly
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-surface-base/60 text-muted hover:text-foreground',
              )}
            >
              {activeOnly ? 'Active staff' : 'Include inactive'}
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-surface-base/50 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
              On file
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-foreground">
              <CalendarHeart className="h-5 w-5 text-primary" aria-hidden />
              {entries.length}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-surface-base/50 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
              This month
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-foreground">
              <Cake className="h-5 w-5 text-primary" aria-hidden />
              {thisMonthCount}
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">
              Celebrating today
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-primary">
              <PartyPopper className="h-5 w-5" aria-hidden />
              {todayCount}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Year calendar</h3>
              <p className="text-xs text-muted">
                Highlighted days have birthdays. Select a month for the full list.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {MONTH_LABELS.map((_, index) => {
              const month = index + 1;
              return (
                <MonthCard
                  key={month}
                  year={year}
                  month={month}
                  entries={byMonth.get(month) ?? []}
                  selected={selectedMonth === month}
                  onSelect={() => setSelectedMonth(month)}
                  isCurrentMonth={
                    year === now.getFullYear() && month === now.getMonth() + 1
                  }
                />
              );
            })}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised/60">
            <header className="border-b border-border/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Upcoming</h3>
              <p className="text-xs text-muted">Next celebrations from today</p>
            </header>
            <div className="divide-y divide-border/50 px-2 py-1">
              {upcoming.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-muted">
                  No birthdays on file yet. Add dates of birth in employee profiles.
                </p>
              ) : (
                upcoming.map((entry) => (
                  <UpcomingCard
                    key={`${entry.employeeDocId}-${entry.occurrenceInYear}`}
                    entry={entry}
                    canOpenEmployee={canOpenEmployee}
                  />
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised/60">
            <header className="border-b border-border/80 px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                {MONTH_LABELS[selectedMonth - 1]} {year}
              </h3>
              <p className="text-xs text-muted">
                {selectedEntries.length}{' '}
                {selectedEntries.length === 1 ? 'birthday' : 'birthdays'}
              </p>
            </header>
            <ul className="max-h-[28rem] space-y-1 overflow-y-auto px-2 py-2">
              {selectedEntries.length === 0 ? (
                <li className="px-2 py-8 text-center text-xs text-muted">
                  No birthdays this month.
                </li>
              ) : (
                selectedEntries.map((entry) => {
                  const row = (
                    <>
                      <Avatar entry={entry} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {entry.name}
                        </p>
                        <p className="text-[11px] text-muted">
                          {MONTH_SHORT_LABELS[entry.month - 1]} {entry.day} · turns{' '}
                          {entry.ageTurning}
                        </p>
                      </div>
                      <Cake className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                    </>
                  );

                  return (
                    <li key={entry.employeeDocId}>
                      {canOpenEmployee ? (
                        <Link
                          href={`/employees/${entry.employeeDocId}/edit`}
                          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-surface-hover/60"
                        >
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2.5 px-2 py-2">{row}</div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
