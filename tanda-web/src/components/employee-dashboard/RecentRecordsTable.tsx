'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { AttendanceTypeBadge } from '@/components/attendance/AttendanceTypeBadge';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import type { EmployeeRecordsRange } from '@/hooks/useEmployeeAttendance';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface RecentRecordsTableProps {
  records: AttendanceRecord[];
  loading: boolean;
  range: EmployeeRecordsRange;
  onRangeChange: (range: EmployeeRecordsRange) => void;
}

const RANGE_OPTIONS: Array<{ id: EmployeeRecordsRange; label: string }> = [
  { id: 'all', label: 'All' },
  { id: '7days', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
];

function RecordPhoto({ photoUrl }: { photoUrl: string }) {
  if (!photoUrl) {
    return <span className="text-[10px] text-subtle">—</span>;
  }

  return (
    <FirebaseImage
      src={photoUrl}
      alt="Photo verification"
      width={32}
      height={32}
      className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700"
      sizes="32px"
      quality={70}
    />
  );
}

export function RecentRecordsTable({
  records,
  loading,
  range,
  onRangeChange,
}: RecentRecordsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <h2 className="text-sm font-semibold text-white">My recent records</h2>

        <div className="flex flex-wrap gap-1.5">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onRangeChange(option.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                range === option.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-hover text-muted hover:text-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingIndicator message="Loading records…" className="py-6" />
      ) : records.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-subtle md:px-5">
          No records in the selected period.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-base/40">
                  <th className="px-5 py-2.5 font-semibold text-muted">Date</th>
                  <th className="px-5 py-2.5 font-semibold text-muted">Type</th>
                  <th className="px-5 py-2.5 font-semibold text-muted">
                    Recorded time
                  </th>
                  <th className="px-5 py-2.5 font-semibold text-muted">
                    Photo verification
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/80 hover:bg-surface-hover/20"
                  >
                    <td className="px-5 py-2.5 text-muted">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-5 py-2.5">
                      <AttendanceTypeBadge type={record.type} />
                    </td>
                    <td className="px-5 py-2.5 text-muted">
                      {formatRecordTime(record.timestampServer)}
                    </td>
                    <td className="px-5 py-2.5">
                      <RecordPhoto photoUrl={record.photoUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border/80 md:hidden">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <RecordPhoto photoUrl={record.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {formatRecordDate(record.timestampServer)}
                    </p>
                    <p className="shrink-0 text-xs text-muted">
                      {formatRecordTime(record.timestampServer)}
                    </p>
                  </div>
                  <div className="mt-1">
                    <AttendanceTypeBadge type={record.type} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
