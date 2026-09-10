'use client';

import { Coffee, MapPin, Radio, Users } from 'lucide-react';
import {
  formatWorkingElapsed,
  formatWorkingSince,
  type WorkingNowPerson,
  type WorkingNowSiteGroup,
} from '@/lib/dashboard/build-working-now';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

interface WorkingNowWidgetProps {
  groups: WorkingNowSiteGroup[];
  people: WorkingNowPerson[];
  loading: boolean;
  nowMs: number;
  timeZone: string;
  workingCount: number;
  onBreakCount: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function PersonRow({
  person,
  nowMs,
  timeZone,
}: {
  person: WorkingNowPerson;
  nowMs: number;
  timeZone: string;
}) {
  const onBreak = person.status === 'on_break';

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-surface-hover/60">
      <div className="relative shrink-0">
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photoUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover ring-2 ring-surface-raised"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-2 ring-surface-raised">
            {initials(person.name)}
          </div>
        )}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-raised',
            onBreak ? 'bg-amber-400' : 'bg-emerald-400',
          )}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {person.name}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              onBreak
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
            )}
          >
            {onBreak ? (
              <Coffee className="h-3 w-3" aria-hidden />
            ) : (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
            {onBreak ? 'On break' : 'Working'}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {person.department
            ? `${person.department} · since ${formatWorkingSince(person.checkedInAt, timeZone)}`
            : `Since ${formatWorkingSince(person.checkedInAt, timeZone)}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            'font-mono text-sm font-semibold tabular-nums',
            onBreak ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300',
          )}
        >
          {formatWorkingElapsed(person.checkedInMs, nowMs)}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-subtle">on site</p>
      </div>
    </li>
  );
}

export function WorkingNowWidget({
  groups,
  people,
  loading,
  nowMs,
  timeZone,
  workingCount,
  onBreakCount,
}: WorkingNowWidgetProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
          <Skeleton className="h-16 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.12] via-surface-raised to-sky-500/[0.08] p-4 md:p-5">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
              <Radio className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Live floor</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Who is clocked in right now, and which client site they are at.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[18rem]">
            <div className="rounded-xl border border-border/70 bg-surface-raised/70 px-3 py-2 text-center backdrop-blur">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                On site
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {people.length}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                Working
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {workingCount}
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700/80 dark:text-amber-300/80">
                Break
              </p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {onBreakCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {people.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Users className="mb-3 h-8 w-8 text-subtle" aria-hidden />
          <p className="text-sm font-medium text-foreground">
            Nobody is clocked in right now
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted">
            When staff punch in at a kiosk, they will appear here live with the
            client site they clocked into.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.locationKey}
              className="overflow-hidden rounded-2xl border border-border bg-surface-raised/40"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border/80 bg-surface-hover/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {group.locationLabel}
                    </h3>
                    <p className="text-[11px] text-muted">
                      {group.people.length}{' '}
                      {group.people.length === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {group.people.some((person) => person.status === 'working') ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {
                        group.people.filter((person) => person.status === 'working')
                          .length
                      }{' '}
                      working
                    </span>
                  ) : null}
                  {group.people.some((person) => person.status === 'on_break') ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                      {
                        group.people.filter((person) => person.status === 'on_break')
                          .length
                      }{' '}
                      break
                    </span>
                  ) : null}
                </div>
              </header>

              <ul className="divide-y divide-border/60 px-2 py-1">
                {group.people.map((person) => (
                  <PersonRow
                    key={person.employeeId}
                    person={person}
                    nowMs={nowMs}
                    timeZone={timeZone}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
