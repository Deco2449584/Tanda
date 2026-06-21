'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { X } from 'lucide-react';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { notifyShiftChange } from '@/lib/notifications/client-notify';
import type { Employee } from '@/lib/types/employee';
import type { AssignShiftInput } from '@/lib/types/shift';

interface AssignShiftModalProps {
  open: boolean;
  initialData: AssignShiftInput | null;
  employees: Employee[];
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
  employees,
  onClose,
}: AssignShiftModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState(emptyForm.startTime);
  const [endTime, setEndTime] = useState(emptyForm.endTime);
  const [department, setDepartment] = useState(emptyForm.department);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !initialData) return;

    setEmployeeId(initialData.employeeId);
    setStartTime(initialData.startTime || emptyForm.startTime);
    setEndTime(initialData.endTime || emptyForm.endTime);
    setDepartment(initialData.department || emptyForm.department);
    setError('');
  }, [open, initialData]);

  if (!open || !initialData) return null;

  const selectedEmployee = employees.find((e) => e.employeeId === employeeId);
  const employeeName = selectedEmployee?.name ?? initialData.employeeName;

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  function handleEmployeeChange(nextId: string) {
    setEmployeeId(nextId);
    const employee = employees.find((e) => e.employeeId === nextId);
    if (employee?.department) {
      setDepartment(employee.department);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const shiftDate = initialData?.date;
    if (!shiftDate) return;

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!employeeId.trim()) {
      setError('Select an employee.');
      return;
    }

    if (!department.trim()) {
      setError('Enter the department.');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, COLLECTIONS.SHIFTS), {
        employeeId: employeeId.trim(),
        date: shiftDate,
        startTime,
        endTime,
        department: department.trim(),
        status: 'scheduled',
      });

      void notifyShiftChange({
        type: 'assigned',
        employeeId: employeeId.trim(),
        date: shiftDate,
        startTime,
        endTime,
        department: department.trim(),
      });

      onClose();
    } catch {
      setError('Could not assign the shift. Please try again.');
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
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 w-[95%] rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Assign shift</h2>
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
            <span className="text-zinc-500">Date:</span> {initialData.date}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="shift-employee" className="mb-1.5 block text-sm text-zinc-400">
              Employee
            </label>
            <select
              id="shift-employee"
              required
              value={employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              disabled={isSubmitting || employees.length === 0}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">Select employee…</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.employeeId}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
            {employeeName && employeeId ? (
              <p className="mt-1 text-xs text-zinc-500">Assigning to {employeeName}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-start" className="mb-1.5 block text-sm text-zinc-400">
                Start time
              </label>
              <input
                id="shift-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="mb-1.5 block text-sm text-zinc-400">
                End time
              </label>
              <input
                id="shift-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="shift-dept" className="mb-1.5 block text-sm text-zinc-400">
              Department
            </label>
            <input
              id="shift-dept"
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
              placeholder="Logistics"
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
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white hover:opacity-90 disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Assign shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
