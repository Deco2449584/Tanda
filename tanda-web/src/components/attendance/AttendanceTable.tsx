'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { LogOut, Pencil, Trash2 } from 'lucide-react';
import { AttendancePhoto } from '@/components/attendance/AttendancePhoto';
import { DeleteConfirmModal } from '@/components/attendance/DeleteConfirmModal';
import { AttendanceTypeBadge } from '@/components/attendance/AttendanceTypeBadge';
import { ForgottenCheckoutBadge } from '@/components/attendance/ForgottenCheckoutBadge';
import { isForgottenCheckIn } from '@/lib/attendance/work-sessions';
import {
  formatRecordDate,
  formatRecordDateShort,
  formatRecordTime,
} from '@/lib/attendance/format';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employeeCodes: Record<string, string>;
  loading: boolean;
  searchQuery: string;
  onEdit: (record: AttendanceRecord) => void;
  onAddManualCheckout: (record: AttendanceRecord) => void;
}

export function AttendanceTable({
  records,
  employeeCodes,
  loading,
  searchQuery,
  onEdit,
  onAddManualCheckout,
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
              <tr className="border-b border-primary/25 bg-primary/10">
                <th className="px-4 py-3.5 font-semibold text-white">
                  Employee ID
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Photo
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Employee
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Warehouse
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Date
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Record Type
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Timestamp (Server)
                </th>
                <th className="px-4 py-3.5 font-semibold text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
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
                      {formatWarehouseLabel(record)}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-4 py-3.5">
                      <AttendanceTypeBadge type={record.type} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {isForgottenCheckIn(record, records) ? (
                        <div className="flex flex-col items-start gap-2">
                          <ForgottenCheckoutBadge />
                          <button
                            type="button"
                            onClick={() => onAddManualCheckout(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Add check-out
                          </button>
                        </div>
                      ) : (
                        formatRecordTime(record.timestampServer)
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-primary"
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

        <ul className="divide-y divide-zinc-800/80 md:hidden">
          {filteredRecords.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-zinc-500">{emptyMessage}</li>
          ) : (
            filteredRecords.map((record) => {
              const forgotten = isForgottenCheckIn(record, records);
              const employeeCode =
                employeeCodes[record.employeeId] ?? record.employeeId ?? '—';

              return (
                <li key={record.id}>
                  <article className="flex items-start gap-2.5 px-3 py-2.5">
                    <AttendancePhoto
                      photoUrl={record.photoUrl}
                      name={record.employeeNameSnapshot}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight text-white">
                            {record.employeeNameSnapshot}
                          </p>
                          <p className="font-mono text-[10px] leading-tight text-zinc-500">
                            {employeeCode}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => onEdit(record)}
                            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-primary"
                            aria-label={`Edit record for ${record.employeeNameSnapshot}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(record)}
                            disabled={deletingId === record.id}
                            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete record for ${record.employeeNameSnapshot}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-zinc-400">
                        <span className="tabular-nums">
                          {formatRecordDateShort(record.timestampServer)}
                        </span>
                        <span className="text-zinc-600" aria-hidden>
                          ·
                        </span>
                        {forgotten ? (
                          <ForgottenCheckoutBadge compact />
                        ) : (
                          <span className="tabular-nums text-zinc-300">
                            {formatRecordTime(record.timestampServer)}
                          </span>
                        )}
                        <AttendanceTypeBadge type={record.type} compact />
                      </div>

                      {forgotten ? (
                        <button
                          type="button"
                          onClick={() => onAddManualCheckout(record)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                        >
                          <LogOut className="h-3 w-3" />
                          Add check-out
                        </button>
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })
          )}
        </ul>

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

function formatWarehouseLabel(record: AttendanceRecord): string {
  if (record.locationNameSnapshot) {
    return record.locationCitySnapshot
      ? `${record.locationNameSnapshot} (${record.locationCitySnapshot})`
      : record.locationNameSnapshot;
  }
  return '—';
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
