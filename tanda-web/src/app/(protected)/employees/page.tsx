'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { CreateEmployeeModal } from '@/components/employees/CreateEmployeeModal';
import { EditEmployeeModal } from '@/components/employees/EditEmployeeModal';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { Employee } from '@/lib/types/employee';

export default function EmployeesPage() {
  const { employees, loading } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Staff Management
      </h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold tracking-wide text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          CREATE NEW EMPLOYEE
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
            placeholder="Search employee..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
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
