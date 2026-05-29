'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

function formatHourlyRate(rate: number): string {
  return `$${rate.toFixed(2)}/hr`;
}

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  onEdit: (employee: Employee) => void;
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        Activo
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
      Inactivo
    </span>
  );
}

export function EmployeeTable({
  employees,
  loading,
  searchQuery,
  onEdit,
}: EmployeeTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) => {
      const employeeCode = employee.employeeId.toLowerCase();
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query) ||
        employeeCode.includes(query)
      );
    });
  }, [employees, searchQuery]);

  async function handleDelete(employee: Employee) {
    if (!db) return;

    const confirmed = window.confirm(
      `¿Eliminar a ${employee.name}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setDeletingId(employee.id);

    try {
      await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id));
    } catch {
      window.alert('No se pudo eliminar el empleado. Intente nuevamente.');
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
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Foto</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">ID Empleado</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Nombre Completo</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Correo Electrónico</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">
                Tarifa Hora (Pagar)
              </th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Área/Dpto</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Estado</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  {searchQuery
                    ? 'No se encontraron empleados con ese criterio.'
                    : 'No hay empleados registrados. Cree el primero.'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/20"
                >
                  <td className="px-4 py-3.5">
                    <EmployeeAvatar
                      name={employee.name}
                      photoUrl={employee.photoUrl}
                    />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-zinc-400">
                    {employee.employeeId || '—'}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">
                    {employee.name}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-400">{employee.email}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {formatHourlyRate(employee.hourlyRate ?? 0)}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">
                    {employee.department || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge active={employee.active} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(employee)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-emerald-400"
                        aria-label={`Editar ${employee.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee)}
                        disabled={deletingId === employee.id}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Eliminar ${employee.name}`}
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
    </div>
  );
}
