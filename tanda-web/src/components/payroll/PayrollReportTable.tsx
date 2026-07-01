'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import type { PayrollReport } from '@/lib/attendance/export-payroll-csv';

interface PayrollReportTableProps {
  report: PayrollReport | null;
  loading: boolean;
}

export function PayrollReportTable({ report, loading }: PayrollReportTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading payroll report…" />
      </div>
    );
  }

  const rows = report?.rows ?? [];
  const currency = report?.currency ?? 'AUD';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="overflow-x-auto scrollbar-modern">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3.5 font-semibold text-white">Employee ID</th>
              <th className="px-4 py-3.5 font-semibold text-white">Employee</th>
              <th className="px-4 py-3.5 font-semibold text-white">Department</th>
              <th className="px-4 py-3.5 font-semibold text-white">Location</th>
              <th className="px-4 py-3.5 font-semibold text-white">Hourly rate</th>
              <th className="px-4 py-3.5 font-semibold text-white">Days</th>
              <th className="px-4 py-3.5 font-semibold text-white">Hours</th>
              <th className="px-4 py-3.5 font-semibold text-white">Gross pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-subtle">
                  No active employees for this period.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.employeeId}
                  className={
                    index % 2 === 0
                      ? 'border-b border-border/50 bg-surface-base/20'
                      : 'border-b border-border/50'
                  }
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {row.employeeId}
                  </td>
                  <td className="px-4 py-3 text-foreground">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{row.department}</td>
                  <td className="px-4 py-3 text-muted">{row.location}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {formatDashboardCurrency(row.hourlyRate, currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {row.daysWorked}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {row.totalHours.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-foreground">
                    {formatDashboardCurrency(row.grossPay, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {report && rows.length > 0 ? (
            <tfoot>
              <tr className="border-t border-primary/25 bg-primary/5 font-semibold text-foreground">
                <td className="px-4 py-3" colSpan={5}>
                  Totals ({report.totals.employees} employees)
                </td>
                <td className="px-4 py-3 tabular-nums">{report.totals.daysWorked}</td>
                <td className="px-4 py-3 tabular-nums">
                  {report.totals.totalHours.toFixed(2)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatDashboardCurrency(report.totals.grossPay, currency)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
