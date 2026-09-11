'use client';

import Link from 'next/link';
import { Cake } from 'lucide-react';
import {
  daysUntilBirthday,
  type BirthdayEntry,
} from '@/lib/employees/birthdays';
import { Skeleton } from '@/components/ui/Skeleton';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { isFirebaseStorageUrl } from '@/utils/imageOptimizer';

interface UpcomingBirthdaysWidgetProps {
  entries: BirthdayEntry[];
  loading?: boolean;
  now?: Date;
}

export function UpcomingBirthdaysWidget({
  entries,
  loading,
  now = new Date(),
}: UpcomingBirthdaysWidgetProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <Cake className="mb-2 h-7 w-7 text-subtle" aria-hidden />
        <p className="text-sm font-medium text-foreground">
          No birthdays in the next 7 days
        </p>
        <p className="mt-1 text-xs text-muted">
          Dates of birth come from employee profiles.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/70">
      {entries.map((entry) => {
        const days = daysUntilBirthday(entry, now);
        return (
          <li
            key={entry.employeeDocId}
            className="flex items-center gap-3 px-1 py-2.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              {entry.photoUrl ? (
                isFirebaseStorageUrl(entry.photoUrl) ? (
                  <FirebaseImage
                    src={entry.photoUrl}
                    alt={entry.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    sizes="40px"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <Cake className="h-4 w-4 text-primary" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {entry.name}
              </p>
              <p className="truncate text-xs text-muted">
                {entry.department || 'No department'}
                {entry.ageTurning > 0 ? ` · turns ${entry.ageTurning}` : ''}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
            </span>
          </li>
        );
      })}
      <li className="pt-3">
        <Link
          href="/employees/birthdays"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Open birthday calendar
        </Link>
      </li>
    </ul>
  );
}
