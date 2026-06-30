'use client';

import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  formatWorkedHours,
  type WorkedShiftRow,
} from '@/lib/attendance/describe-work-shift';
import { formatRecordDateShort } from '@/lib/attendance/format';
import { Timestamp } from 'firebase/firestore';

interface WorkedShiftsTableProps {
  rows: WorkedShiftRow[];
  loading: boolean;
  showEmployee?: boolean;
  employeeCodes?: Record<string, string>;
  emptyMessage?: string;
}

function formatDisplayDate(date: string): string {
  return formatRecordDateShort(
    Timestamp.fromDate(new Date(`${date}T12:00:00`)),
  );
}

export function WorkedShiftsTable({
  rows,
  loading,
  showEmployee = false,
  employeeCodes = {},
  emptyMessage = 'No worked shifts in the selected period.',
}: WorkedShiftsTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading worked shifts…" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="hidden overflow-x-auto scrollbar-modern md:block">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              {showEmployee ? (
                <>
                  <th className="px-4 py-3.5 font-semibold text-white">
                    Employee ID
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-white">Photo</th>
                  <th className="px-4 py-3.5 font-semibold text-white">
                    Employee
                  </th>
                </>
              ) : (
                <th className="px-4 py-3.5 font-semibold text-white">Photo</th>
              )}
              <th className="px-4 py-3.5 font-semibold text-white">Date</th>
              <th className="px-4 py-3.5 font-semibold text-white">Warehouse</th>
              <th className="px-4 py-3.5 font-semibold text-white">Check-in</th>
              <th className="px-4 py-3.5 font-semibold text-white">Check-out</th>
              <th className="px-4 py-3.5 font-semibold text-white">Hours</th>
              <th className="px-4 py-3.5 font-semibold text-white">Break</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showEmployee ? 9 : 7}
                  className="px-4 py-12 text-center text-subtle"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/80 transition-colors hover:bg-surface-hover/20 ${
                    index % 2 === 1 ? 'bg-surface-base/40' : ''
                  }`}
                >
                  {showEmployee ? (
                    <>
                      <td className="px-4 py-3.5 font-mono text-muted">
                        {employeeCodes[row.employeeId] ?? row.employeeId}
                      </td>
                      <td className="px-4 py-3.5">
                        <EmployeeAvatar
                          name={row.employeeName}
                          photoUrl={row.photoUrl}
                          size="md"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-white">
                        {row.employeeName}
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-3.5">
                      <EmployeeAvatar
                        name={row.employeeName}
                        photoUrl={row.photoUrl}
                        size="md"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-muted">
                    {formatDisplayDate(row.date)}
                  </td>
                  <td className="px-4 py-3.5 text-muted">{row.locationLabel}</td>
                  <td className="px-4 py-3.5 tabular-nums text-muted">
                    {row.checkInTime}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-muted">
                    {row.checkOutTime}
                  </td>
                  <td className="px-4 py-3.5 text-white">
                    <span className="font-medium">
                      {formatWorkedHours(row.billableHours)}
                    </span>
                    {row.grossHours !== row.billableHours ? (
                      <span className="ml-1.5 text-xs text-subtle">
                        ({formatWorkedHours(row.grossHours)} gross)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-muted">{row.break.summary}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/80 md:hidden">
        {rows.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-subtle">
            {emptyMessage}
          </li>
        ) : (
          rows.map((row) => {
            const employeeCode =
              employeeCodes[row.employeeId] ?? row.employeeId ?? '—';
            const metaParts = [
              formatDisplayDate(row.date),
              row.locationLabel !== '—' ? row.locationLabel : null,
              `${row.checkInTime} – ${row.checkOutTime}`,
            ].filter(Boolean);

            return (
              <li key={row.id}>
                <article className="relative flex gap-3 border-l-2 border-l-primary/60 px-4 py-3">
                  <EmployeeAvatar
                    name={row.employeeName}
                    photoUrl={row.photoUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {showEmployee ? row.employeeName : formatDisplayDate(row.date)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {showEmployee ? (
                          <>
                            <span className="font-mono text-subtle">{employeeCode}</span>
                            <span className="text-subtle" aria-hidden>
                              {' · '}
                            </span>
                          </>
                        ) : null}
                        <span className="tabular-nums">{metaParts.join(' · ')}</span>
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                        {formatWorkedHours(row.billableHours)}
                      </span>
                      <span className="text-muted">{row.break.summary}</span>
                    </div>
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-subtle">
        <span>Showing {rows.length} worked shift{rows.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
