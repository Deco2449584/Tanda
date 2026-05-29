'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { X } from 'lucide-react';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AssignShiftInput } from '@/lib/types/shift';

interface AssignShiftModalProps {
  open: boolean;
  initialData: AssignShiftInput | null;
  onClose: () => void;
}

const emptyForm: Omit<AssignShiftInput, 'employeeId' | 'employeeName' | 'date'> = {
  startTime: '09:00',
  endTime: '17:00',
  department: '',
};

export function AssignShiftModal({
  open,
  initialData,
  onClose,
}: AssignShiftModalProps) {
  const [startTime, setStartTime] = useState(emptyForm.startTime);
  const [endTime, setEndTime] = useState(emptyForm.endTime);
  const [department, setDepartment] = useState(emptyForm.department);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialData) return;
    setStartTime(emptyForm.startTime);
    setEndTime(emptyForm.endTime);
    setDepartment(initialData.department);
    setError('');
  }, [initialData]);

  if (!open || !initialData) return null;

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!initialData) return;

    if (!db) {
      setError('Firebase no está disponible.');
      return;
    }

    if (!department.trim()) {
      setError('Indique el departamento.');
      return;
    }

    if (startTime >= endTime) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, COLLECTIONS.SHIFTS), {
        employeeId: initialData.employeeId,
        date: initialData.date,
        startTime,
        endTime,
        department: department.trim(),
        status: 'scheduled',
      });

      onClose();
    } catch {
      setError('No se pudo asignar el turno. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar modal"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Asignar turno</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm">
          <p className="text-zinc-300">
            <span className="text-zinc-500">Empleado:</span>{' '}
            {initialData.employeeName}
          </p>
          <p className="mt-1 text-zinc-300">
            <span className="text-zinc-500">ID:</span> {initialData.employeeId}
          </p>
          <p className="mt-1 text-zinc-300">
            <span className="text-zinc-500">Fecha:</span> {initialData.date}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-start" className="mb-1.5 block text-sm text-zinc-400">
                Hora inicio
              </label>
              <input
                id="shift-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="mb-1.5 block text-sm text-zinc-400">
                Hora fin
              </label>
              <input
                id="shift-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="shift-dept" className="mb-1.5 block text-sm text-zinc-400">
              Departamento
            </label>
            <input
              id="shift-dept"
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 disabled:opacity-60"
              placeholder="Logística"
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
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : 'Asignar turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
