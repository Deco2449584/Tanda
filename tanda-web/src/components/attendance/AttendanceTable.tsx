'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { AttendancePhoto } from '@/components/attendance/AttendancePhoto';
import { DeleteConfirmModal } from '@/components/attendance/DeleteConfirmModal';
import { ForgottenCheckoutBadge } from '@/components/attendance/ForgottenCheckoutBadge';
import { isForgottenCheckIn } from '@/lib/attendance/work-sessions';
import {
  formatAttendanceType,
  formatRecordDate,
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
}

function RecordTypeBadge({ type }: { type: AttendanceRecord['type'] }) {
  const isCheckIn = type === 'check_in';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isCheckIn
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-blue-500/10 text-blue-400'
      }`}
    >
      {formatAttendanceType(type)}
    </span>
  );
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
      window.alert('No se pudo eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-emerald-900/50 bg-emerald-950/40">
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  ID Empleado
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Foto
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Empleado
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Fecha
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Tipo Registro
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Timestamp (Server)
                </th>
                <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    {searchQuery
                      ? 'No se encontraron registros con ese nombre.'
                      : 'No hay registros en el rango seleccionado.'}
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
                      <RecordTypeBadge type={record.type} />
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
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
                          aria-label={`Editar registro de ${record.employeeNameSnapshot}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(record)}
                          disabled={deletingId === record.id}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Eliminar registro de ${record.employeeNameSnapshot}`}
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

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>
            Mostrando {filteredRecords.length} de {records.length} registros
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
