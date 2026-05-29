'use client';

import { formatAttendanceType, formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface RecentRecordsTableProps {
  records: AttendanceRecord[];
  loading: boolean;
}

export function RecentRecordsTable({ records, loading }: RecentRecordsTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Mis últimos registros</h2>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">
          Cargando registros...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40">
                <th className="px-5 py-3 font-semibold text-zinc-400">Fecha</th>
                <th className="px-5 py-3 font-semibold text-zinc-400">Tipo</th>
                <th className="px-5 py-3 font-semibold text-zinc-400">
                  Hora registrada
                </th>
                <th className="px-5 py-3 font-semibold text-zinc-400">
                  Validación fotográfica
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-zinc-500">
                    No hay registros recientes.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-800/20"
                  >
                    <td className="px-5 py-3.5 text-zinc-300">
                      {formatRecordDate(record.timestampServer)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-200">
                      {formatAttendanceType(record.type)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">
                      {formatRecordTime(record.timestampServer)}
                    </td>
                    <td className="px-5 py-3.5">
                      {record.photoUrl ? (
                        <img
                          src={record.photoUrl}
                          alt="Validación fotográfica"
                          className="h-9 w-9 rounded-full object-cover ring-2 ring-zinc-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
