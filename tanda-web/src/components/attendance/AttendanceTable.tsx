'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { AttendancePhoto } from '@/components/attendance/AttendancePhoto';
import { DeleteConfirmModal } from '@/components/attendance/DeleteConfirmModal';
import { AttendanceTypeBadge } from '@/components/attendance/AttendanceTypeBadge';
import { ForgottenCheckoutBadge } from '@/components/attendance/ForgottenCheckoutBadge';
import { isForgottenCheckIn } from '@/lib/attendance/work-sessions';
import { formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employeeCodes: Record<string, string>;
  loading: boolean;
  searchQuery: string;
  onEdit: (record: AttendanceRecord) => void;
}

export function AttendanceTable({
  records,
  employeeCodes,
  loading,
  searchQuery,
  onEdit,
}: AttendanceTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AttendanceRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return records;

    return records.filter((record) =>
      record.employeeNameSnapshot.toLowerCase().includes(queryText),
    );
  }, [records, searchQuery]);

  async function handleConfirmDelete() {
    if (!db || !pendingDelete) return;

    setDeletingId(pendingDelete.id);

    try {
      await deleteDoc(
        doc(db, COLLECTIONS.ATTENDANCE_RECORDS, pendingDelete.id),
      );
      setPendingDelete(null);
    } catch {
      window.alert('Could not delete the record.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No records found with that name.'
    : 'No records in the selected range.';

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <div className="hidden md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-blue-900/50 bg-blue-950/40">
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Employee ID
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Photo
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Employee
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Date
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Record Type
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Timestamp (Server)
                </th>
                <th className="px-4 py-3.5 font-semibold text-blue-100/90">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/20 ${
                      index % 2 === 1 ? 'bg-zinc-950/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono text-zinc-400">
                      {employeeCodes[record.employeeId] ?? record.employeeId ?? '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <AttendancePhoto
                        photoUrl={record.photoUrl}
                        name={record.employeeNameSnapshot}
                      />
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white">
                      {record.employeeNameSnapshot}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-4 py-3.5">
                      <AttendanceTypeBadge type={record.type} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {isForgottenCheckIn(record, records) ? (
                        <ForgottenCheckoutBadge />
                      ) : (
                        formatRecordTime(record.timestampServer)
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                          aria-label={`Edit record for ${record.employeeNameSnapshot}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(record)}
                          disabled={deletingId === record.id}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete record for ${record.employeeNameSnapshot}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 p-4 md:hidden">
          {filteredRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
          ) : (
            filteredRecords.map((record) => {
              const forgotten = isForgottenCheckIn(record, records);
              const timeOrStatus = forgotten ? (
                <ForgottenCheckoutBadge />
              ) : (
                formatRecordTime(record.timestampServer)
              );

              return (
                <article
                  key={record.id}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-white">
                        {record.employeeNameSnapshot}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">
                        {employeeCodes[record.employeeId] ?? record.employeeId ?? '—'}
                      </p>
                    </div>
                    <AttendancePhoto
                      photoUrl={record.photoUrl}
                      name={record.employeeNameSnapshot}
                    />
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                      <dt className="text-zinc-500">Date</dt>
                      <dd className="text-zinc-300">
                        {formatRecordDate(record.timestampServer)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                      <dt className="text-zinc-500">Type</dt>
                      <dd>
                        <AttendanceTypeBadge type={record.type} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-zinc-500">{forgotten ? 'Status' : 'Time'}</dt>
                      <dd className="text-zinc-300">{timeOrStatus}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex justify-end gap-2 border-t border-zinc-800/60 pt-3">
                    <button
                      type="button"
                      onClick={() => onEdit(record)}
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                      aria-label={`Edit record for ${record.employeeNameSnapshot}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(record)}
                      disabled={deletingId === record.id}
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete record for ${record.employeeNameSnapshot}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>
            Showing {filteredRecords.length} of {records.length} records
          </span>
        </div>
      </div>

      <DeleteConfirmModal
        employeeName={pendingDelete?.employeeNameSnapshot ?? null}
        loading={deletingId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export function filterRecordsByEmployeeName(
  records: AttendanceRecord[],
  searchQuery: string,
): AttendanceRecord[] {
  const queryText = searchQuery.trim().toLowerCase();
  if (!queryText) return records;

  return records.filter((record) =>
    record.employeeNameSnapshot.toLowerCase().includes(queryText),
  );
}
