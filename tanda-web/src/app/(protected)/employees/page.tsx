'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Plus, Search } from 'lucide-react';
import { CreateEmployeeModal } from '@/components/employees/CreateEmployeeModal';
import { EditEmployeeModal } from '@/components/employees/EditEmployeeModal';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import type { Employee } from '@/lib/types/employee';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped: Employee[] = snapshot.docs.map((document) =>
          mapEmployeeDoc(document.id, document.data()),
        );
        setEmployees(
          mapped.sort((a, b) => a.name.localeCompare(b.name, 'es')),
        );
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Gestión de Personal (CRUD de Empleados)
      </h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          CREAR NUEVO EMPLEADO
        </button>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar empleado..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/30"
          />
        </div>
      </div>

      <EmployeeTable
        employees={employees}
        loading={loading}
        searchQuery={searchQuery}
        onEdit={setEditingEmployee}
      />

      <CreateEmployeeModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <EditEmployeeModal
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
      />
    </div>
  );
}
