'use client';

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

function RecordPhoto({ photoUrl }: { photoUrl: string }) {
  if (!photoUrl) {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  return (
    <FirebaseImage
      src={photoUrl}
      alt="Photo verification"
      width={40}
      height={40}
      className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-700"
      sizes="40px"
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
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5 md:py-4">
        <h2 className="text-sm font-semibold text-white">My recent records</h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRangeChange('7days')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === '7days'
                ? 'bg-primary text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => onRangeChange('month')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              range === 'month'
                ? 'bg-primary text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Last month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500 md:px-5">
          Loading records...
        </div>
      ) : records.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500 md:px-5">
          No records in the selected period.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40">
                  <th className="px-5 py-3 font-semibold text-zinc-400">Date</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Type</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">
                    Recorded time
                  </th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">
                    Photo verification
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-800/20"
                  >
                    <td className="px-5 py-3.5 text-zinc-300">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-5 py-3.5">
                      <AttendanceTypeBadge type={record.type} />
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">
                      {formatRecordTime(record.timestampServer)}
                    </td>
                    <td className="px-5 py-3.5">
                      <RecordPhoto photoUrl={record.photoUrl} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {records.map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Date
                      </p>
                      <p className="font-medium text-zinc-200">
                        {formatRecordDate(record.timestampServer)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Time
                      </p>
                      <p className="font-medium text-zinc-200">
                        {formatRecordTime(record.timestampServer)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Type
                      </p>
                      <AttendanceTypeBadge type={record.type} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Photo
                    </p>
                    <RecordPhoto photoUrl={record.photoUrl} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
