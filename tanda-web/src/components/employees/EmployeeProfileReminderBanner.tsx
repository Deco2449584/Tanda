'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IdCard, X } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { normalizePersonalProfileStatus } from '@/lib/employees/personal-profile-status';

/**
 * Non-blocking reminder for employees who still need to submit (or re-submit)
 * personal profile details. Keeps reappearing until status is Pending/Approved.
 */
export function EmployeeProfileReminderBanner() {
  const pathname = usePathname() ?? '';
  const { user, role } = useAuthRole();
  const { employee, loading, refresh } = useCurrentEmployee(
    role === 'empleado' ? user?.email : null,
  );
  const [dismissedForPath, setDismissedForPath] = useState<string | null>(null);

  useEffect(() => {
    setDismissedForPath(null);
    if (role === 'empleado') {
      refresh();
    }
  }, [pathname, refresh, role]);

  if (role !== 'empleado' || loading || !employee) return null;

  const status = normalizePersonalProfileStatus(employee.personalProfileStatus);
  if (status === 'Approved' || status === 'Pending') return null;

  // Already on the form — page copy covers the reminder.
  if (pathname === '/my-profile' || pathname.startsWith('/my-profile/')) {
    return null;
  }

  if (dismissedForPath === pathname) return null;

  const isRejected = status === 'Rejected';

  return (
    <div
      role="status"
      className="sticky top-0 z-30 border-b border-primary/25 bg-primary/10 px-4 py-3 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <IdCard className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isRejected
              ? 'Your personal profile needs updates'
              : 'Complete your personal profile'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {isRejected
              ? 'Your submission was rejected. Update your details and submit again for review.'
              : 'Please fill in your personal details and passport/visa documents. You can keep using the app meanwhile.'}
          </p>
          <Link
            href="/my-profile"
            className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
          >
            Go to My profile
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setDismissedForPath(pathname)}
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
          aria-label="Dismiss for now"
          title="Hide on this page — reminder will return when you navigate"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function employeeNeedsPersonalProfile(
  status: string | null | undefined,
): boolean {
  const normalized = normalizePersonalProfileStatus(status);
  return normalized === 'none' || normalized === 'Rejected';
}
