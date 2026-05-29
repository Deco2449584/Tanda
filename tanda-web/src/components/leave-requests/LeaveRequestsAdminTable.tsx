'use client';

import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { LeaveRequestStatusBadge } from '@/components/leave-requests/LeaveRequestStatusBadge';
import { COLLECTIONS } from '@/lib/constants';
import {
  formatLeaveDateRange,
  truncateText,
} from '@/lib/leave-requests/format';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

interface LeaveRequestsAdminTableProps {
  requests: LeaveRequest[];
  employeesByCode: Record<string, Employee>;
  loading: boolean;
  searchQuery: string;
}

export function LeaveRequestsAdminTable({
  requests,
  employeesByCode,
  loading,
  searchQuery,
}: LeaveRequestsAdminTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return requests;

    return requests.filter((request) => {
      const employee = employeesByCode[request.employeeId];
      const name = employee?.name.toLowerCase() ?? '';
      const code = request.employeeId.toLowerCase();
      return (
        name.includes(queryText) ||
        code.includes(queryText) ||
        request.type.toLowerCase().includes(queryText)
      );
    });
  }, [requests, searchQuery, employeesByCode]);

  async function updateStatus(
    requestId: string,
    status: Exclude<LeaveRequestStatus, 'Pendiente'>,
  ) {
    if (!db) return;

    setUpdatingId(requestId);

    try {
      await updateDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId), {
        status,
      });
    } catch {
      window.alert('No se pudo actualizar el estado de la solicitud.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-emerald-900/50 bg-emerald-950/30">
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">Foto</th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                ID Empleado
              </th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                Tipo de permiso
              </th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                Rango de fechas
              </th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                Justificación (Resumen)
              </th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                Estado
              </th>
              <th className="px-4 py-3.5 font-semibold text-emerald-100/90">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  No hay solicitudes con los filtros actuales.
                </td>
              </tr>
            ) : (
              filteredRequests.map((request, index) => {
                const employee = employeesByCode[request.employeeId];
                const isPending = request.status === 'Pendiente';
                const isUpdating = updatingId === request.id;

                return (
                  <tr
                    key={request.id}
                    className={`border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/20 ${
                      index % 2 === 1 ? 'bg-zinc-950/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <EmployeeAvatar
                        name={employee?.name ?? request.employeeId}
                        photoUrl={employee?.photoUrl}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-zinc-400">
                        {request.employeeId}
                      </p>
                      <p className="text-sm font-medium text-white">
                        {employee?.name ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-200">{request.type}</td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {formatLeaveDateRange(request.startDate, request.endDate)}
                    </td>
                    <td className="max-w-[240px] px-4 py-3.5 text-zinc-400">
                      {truncateText(request.justification, 56)}
                    </td>
                    <td className="px-4 py-3.5">
                      <LeaveRequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(request.id, 'Aprobado')}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check className="h-3.5 w-3.5" />
                            APROBAR
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(request.id, 'Rechazado')}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" />
                            RECHAZAR
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-emerald-500/80 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
                            aria-label="Editar solicitud"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-emerald-500/80 transition-colors hover:bg-zinc-800 hover:text-red-400"
                            aria-label="Eliminar solicitud"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
