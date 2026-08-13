'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import {
  bandDisplayName,
  dayTypeDisplayName,
  type AwardIncompleteSession,
  type AwardSessionLine,
  type AwardSlice,
} from '@/lib/payroll/award-calc';
import type { PayRules } from '@/lib/types/pay-rules';

interface AwardSessionDetailProps {
  line: AwardSessionLine | null;
  incomplete: AwardIncompleteSession | null;
  slices: AwardSlice[];
  rules: PayRules;
  currency: string;
  onClose: () => void;
}

export function AwardSessionDetail({
  line,
  incomplete,
  slices,
  rules,
  currency,
  onClose,
}: AwardSessionDetailProps) {
  if (!line && !incomplete) return null;

  const title = line?.employeeName ?? incomplete?.employeeName ?? 'Session';
  const date = line?.date ?? incomplete?.date ?? '';

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close session details"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-raised p-5 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-muted">
              {date}
              {line?.locationName ? ` · ${line.locationName}` : ''}
              {line?.isLeave ? ' · Paid leave' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {incomplete ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              This session has no check-out ({incomplete.status}) and is excluded from pay and
              charge.
            </p>
            <Link
              href="/attendance"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Open Attendance to fix it
            </Link>
          </div>
        ) : null}

        {line ? (
          <>
            <dl className="grid gap-3 rounded-xl border border-border bg-surface-base/40 p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-subtle">Clock</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {line.clockHours.toFixed(2)} h
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Billable</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {line.billableHours.toFixed(2)} h
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Paid / charged</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {line.payHours.toFixed(2)} h / {line.chargeHours.toFixed(2)} h
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Pay</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {formatDashboardCurrency(line.payAmount, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Charge</dt>
                <dd className="mt-0.5 tabular-nums text-foreground">
                  {formatDashboardCurrency(line.chargeAmount, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Flags</dt>
                <dd className="mt-0.5 text-muted">
                  {[
                    line.minPayApplied ? 'Min pay applied' : null,
                    line.minChargeApplied ? 'Min charge applied' : null,
                    line.usedFallbackRate ? 'Used base hourly rate' : null,
                    line.hasOvertime ? 'Overtime' : null,
                    line.missingSiteChargeCard ? 'No site charge card' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'None'}
                </dd>
              </div>
            </dl>

            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-primary/25 bg-primary/10">
                    <th className="px-3 py-2 font-semibold text-white">Band</th>
                    <th className="px-3 py-2 font-semibold text-white">Pay hrs</th>
                    <th className="px-3 py-2 font-semibold text-white">Pay rate</th>
                    <th className="px-3 py-2 font-semibold text-white">Pay</th>
                    <th className="px-3 py-2 font-semibold text-white">Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {slices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-subtle">
                        No priced slices.
                      </td>
                    </tr>
                  ) : (
                    slices.map((slice) => (
                      <tr
                        key={`${slice.sessionKey}|${slice.dayTypeId}|${slice.bandId}`}
                        className="border-b border-border/50"
                      >
                        <td className="px-3 py-2 text-foreground">
                          {dayTypeDisplayName(rules, slice.dayTypeId)} ·{' '}
                          {bandDisplayName(rules, slice.bandId)}
                          {slice.usedFallbackRate ? (
                            <span className="ml-2 text-xs text-amber-300">inherits hourly rate</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted">
                          {slice.payHours.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted">
                          {formatDashboardCurrency(slice.payRate, currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {formatDashboardCurrency(slice.payAmount, currency)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-foreground">
                          {formatDashboardCurrency(slice.chargeAmount, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
