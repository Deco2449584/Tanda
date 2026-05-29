'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { CreateEmployeeInput } from '@/lib/types/employee';

interface CreateEmployeeModalProps {
  open: boolean;
  onClose: () => void;
}

const initialForm: CreateEmployeeInput = {
  employeeId: '',
  name: '',
  email: '',
  department: '',
  hourlyRate: 0,
};

export function CreateEmployeeModal({ open, onClose }: CreateEmployeeModalProps) {
  const [form, setForm] = useState<CreateEmployeeInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function handleClose() {
    if (saving) return;
    setForm(initialForm);
    setError('');
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!db) {
      setError('Firebase no está disponible.');
      return;
    }

    if (
      !form.employeeId.trim() ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.department.trim()
    ) {
      setError('Complete todos los campos obligatorios.');
      return;
    }

    if (form.hourlyRate <= 0) {
      setError('La tarifa por hora debe ser mayor a cero.');
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, COLLECTIONS.EMPLOYEES), {
        employeeId: form.employeeId.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        hourlyRate: form.hourlyRate,
        active: true,
        lastAction: 'none',
        lastTimestampServer: serverTimestamp(),
      });

      setForm(initialForm);
      onClose();
    } catch {
      setError('No se pudo guardar el empleado. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-employee-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar modal"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="create-employee-title"
            className="text-lg font-semibold text-white"
          >
            Crear nuevo empleado
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emp-id" className="mb-1.5 block text-sm text-zinc-400">
              ID de Empleado
            </label>
            <input
              id="emp-id"
              type="text"
              required
              value={form.employeeId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="0045"
            />
          </div>

          <div>
            <label htmlFor="emp-name" className="mb-1.5 block text-sm text-zinc-400">
              Nombre
            </label>
            <input
              id="emp-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label htmlFor="emp-email" className="mb-1.5 block text-sm text-zinc-400">
              Correo
            </label>
            <input
              id="emp-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="correo@empresa.com"
            />
          </div>

          <div>
            <label htmlFor="emp-dept" className="mb-1.5 block text-sm text-zinc-400">
              Departamento
            </label>
            <input
              id="emp-dept"
              type="text"
              required
              value={form.department}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, department: e.target.value }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="Logística, Operaciones..."
            />
          </div>

          <div>
            <label htmlFor="emp-rate" className="mb-1.5 block text-sm text-zinc-400">
              Tarifa hora ($)
            </label>
            <input
              id="emp-rate"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.hourlyRate || ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  hourlyRate: parseFloat(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="18.50"
            />
          </div>

          {error && (
            <p className="text-center text-xs text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Guardando...' : 'Guardar empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
