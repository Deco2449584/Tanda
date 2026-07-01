'use client';

import { useMemo, useState } from 'react';
import { LogOut, Pencil, Trash2 } from 'lucide-react';
import { deleteAttendanceRecordRequest } from '@/lib/attendance/attendance-records-api';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AttendancePhoto } from '@/components/attendance/AttendancePhoto';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { DeleteConfirmModal } from '@/components/attendance/DeleteConfirmModal';
import { AttendanceTypeBadge } from '@/components/attendance/AttendanceTypeBadge';
import { ForgottenCheckoutBadge } from '@/components/attendance/ForgottenCheckoutBadge';
import {
  AttendanceProvenanceBadge,
  AttendanceProvenanceNote,
} from '@/components/attendance/ManualAttendanceBadge';
import { isForgottenCheckIn } from '@/lib/attendance/work-sessions';
import {
  formatRecordDate,
  formatRecordDateShort,
  formatRecordTime,
} from '@/lib/attendance/format';
import {
  formatKioskLabel,
  formatWarehouseLabel,
} from '@/lib/attendance/location-display';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employeeCodes: Record<string, string>;
  loading: boolean;
  searchQuery: string;
  onEdit?: (record: AttendanceRecord) => void;
  onAddManualCheckout?: (record: AttendanceRecord) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function AttendanceTable({
  records,
  employeeCodes,
  loading,
  searchQuery,
  onEdit,
  onAddManualCheckout,
  canUpdate = false,
  canDelete = false,
}: AttendanceTableProps) {
  const { isMaster } = useAdminAccess();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AttendanceRecord | null>(null);

  const showRowActions = canUpdate || canDelete || Boolean(onAddManualCheckout);

  const filteredRecords = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return records;

    return records.filter((record) =>
      record.employeeNameSnapshot.toLowerCase().includes(queryText),
    );
  }, [records, searchQuery]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);

    try {
      await deleteAttendanceRecordRequest(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      window.alert('Could not delete the record.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading attendance…" />
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No records found with that name.'
    : 'No records in the selected range.';

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
        <div className="hidden overflow-x-auto scrollbar-modern md:block">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
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
                  Kiosk
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
                {showRowActions ? (
                  <th className="px-4 py-3.5 font-semibold text-white">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-subtle">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-b border-border/80 transition-colors hover:bg-surface-hover/20 ${
                      index % 2 === 1 ? 'bg-surface-base/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono text-muted">
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
                    <td className="px-4 py-3.5 text-muted">
                      {formatWarehouseLabel(record)}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatKioskLabel(record)}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AttendanceTypeBadge type={record.type} />
                        {isMaster ? (
                          <AttendanceProvenanceBadge record={record} />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {isForgottenCheckIn(record, records) ? (
                        <div className="flex flex-col items-start gap-2">
                          <ForgottenCheckoutBadge />
                          {onAddManualCheckout ? (
                            <button
                              type="button"
                              onClick={() => onAddManualCheckout(record)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Add check-out
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <span>{formatRecordTime(record.timestampServer)}</span>
                          {isMaster ? (
                            <AttendanceProvenanceNote record={record} compact />
                          ) : null}
                        </div>
                      )}
                    </td>
                    {showRowActions ? (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {canUpdate && onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(record)}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                              aria-label={`Edit record for ${record.employeeNameSnapshot}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(record)}
                              disabled={deletingId === record.id}
                              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Delete record for ${record.employeeNameSnapshot}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-border/80 md:hidden">
          {filteredRecords.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-subtle">{emptyMessage}</li>
          ) : (
            filteredRecords.map((record) => {
              const forgotten = isForgottenCheckIn(record, records);
              const employeeCode =
                employeeCodes[record.employeeId] ?? record.employeeId ?? '—';
              const warehouse = formatWarehouseLabel(record);
              const isCheckIn = record.type === 'check_in';
              const metaParts = [
                formatRecordDateShort(record.timestampServer),
                forgotten ? null : formatRecordTime(record.timestampServer),
                warehouse !== '—' ? warehouse : null,
              ].filter(Boolean);

              return (
                <li key={record.id}>
                  <article
                    className={`relative flex gap-3 px-4 py-3 ${
                      isCheckIn ? 'border-l-2 border-l-emerald-500/70' : 'border-l-2 border-l-primary/60'
                    }`}
                  >
                    <AttendancePhoto
                      photoUrl={record.photoUrl}
                      name={record.employeeNameSnapshot}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {record.employeeNameSnapshot}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            <span className="font-mono text-subtle">{employeeCode}</span>
                            {metaParts.length > 0 ? (
                              <>
                                <span className="text-subtle" aria-hidden>
                                  {' · '}
                                </span>
                                <span className="tabular-nums">{metaParts.join(' · ')}</span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                          {canUpdate && onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(record)}
                              className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-primary"
                              aria-label={`Edit record for ${record.employeeNameSnapshot}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(record)}
                              disabled={deletingId === record.id}
                              className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Delete record for ${record.employeeNameSnapshot}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <AttendanceTypeBadge type={record.type} compact />
                        {forgotten ? <ForgottenCheckoutBadge compact /> : null}
                        {isMaster ? (
                          <AttendanceProvenanceBadge record={record} compact />
                        ) : null}
                      </div>

                      {forgotten && onAddManualCheckout ? (
                        <button
                          type="button"
                          onClick={() => onAddManualCheckout(record)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                        >
                          <LogOut className="h-3.5 w-3.5" />
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

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-subtle">
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



