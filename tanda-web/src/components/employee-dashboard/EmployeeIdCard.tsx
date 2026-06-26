'use client';

import { BadgeCheck } from 'lucide-react';

interface EmployeeIdCardProps {
  employeeId: string;
  loading?: boolean;
}

function EmployeeIdDigits({ value }: { value: string }) {
  const digits = value.trim().split('');

  return (
    <div
      className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3"
      aria-label={`Employee ID: ${value}`}
    >
      {digits.map((digit, index) => (
        <span
          key={`${digit}-${index}`}
          className="flex h-14 w-11 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-2xl font-bold tabular-nums tracking-widest text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-16 sm:w-12 sm:text-3xl"
        >
          {digit}
        </span>
      ))}
    </div>
  );
}

export function EmployeeIdCard({ employeeId, loading = false }: EmployeeIdCardProps) {
  const displayId = employeeId.trim();

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(59,130,246,0.16),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-primary">
        <BadgeCheck className="h-4 w-4 shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Your employee ID</p>
      </div>

      <p className="mt-2 text-sm text-subtle">
        Use this number at the warehouse time clock when you clock in or out.
      </p>

      <div className="mt-5">
        {loading ? (
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start sm:gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <span
                key={index}
                className="h-14 w-11 animate-pulse rounded-xl border border-border bg-surface-hover sm:h-16 sm:w-12"
              />
            ))}
          </div>
        ) : displayId ? (
          <EmployeeIdDigits value={displayId} />
        ) : (
          <p className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
            Your administrator has not assigned an employee ID yet.
          </p>
        )}
      </div>
    </section>
  );
}
