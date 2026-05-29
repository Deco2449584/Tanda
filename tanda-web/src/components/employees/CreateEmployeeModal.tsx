'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { X } from 'lucide-react';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import { COLLECTIONS } from '@/lib/constants';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isBusy = isUploading || isSubmitting;

  if (!open) return null;

  function resetForm() {
    setForm(initialForm);
    setPhotoFile(null);
    setError('');
  }

  function handleClose() {
    if (isBusy) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (
      !form.employeeId.trim() ||
      !form.name.trim() ||
      !form.email.trim() ||
      !form.department.trim()
    ) {
      setError('Complete all required fields.');
      return;
    }

    if (form.hourlyRate <= 0) {
      setError('Hourly rate must be greater than zero.');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = '';

      if (photoFile) {
        setIsUploading(true);
        photoUrl = await uploadEmployeeAvatar(form.employeeId.trim(), photoFile);
        setIsUploading(false);
      }

      const payload: Record<string, unknown> = {
        employeeId: form.employeeId.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        hourlyRate: form.hourlyRate,
        active: true,
        lastAction: 'none',
        lastTimestampServer: serverTimestamp(),
      };

      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }

      await addDoc(collection(db, COLLECTIONS.EMPLOYEES), payload);

      resetForm();
      onClose();
    } catch {
      setError(
        isUploading
          ? 'Could not upload the image. Please try again.'
          : 'Could not save the employee. Please try again.',
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  function getSubmitLabel() {
    if (isUploading) return 'Uploading image...';
    if (isSubmitting) return 'Saving...';
    return 'Save employee';
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
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2
            id="create-employee-title"
            className="text-lg font-semibold text-white"
          >
            Create new employee
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <EmployeePhotoUpload
            selectedFile={photoFile}
            onFileChange={setPhotoFile}
            disabled={isBusy}
          />

          <div>
            <label htmlFor="emp-id" className="mb-1.5 block text-sm text-zinc-400">
              Employee ID
            </label>
            <input
              id="emp-id"
              type="text"
              required
              value={form.employeeId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
              placeholder="0045"
            />
          </div>

          <div>
            <label htmlFor="emp-name" className="mb-1.5 block text-sm text-zinc-400">
              Name
            </label>
            <input
              id="emp-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
              placeholder="Full name"
            />
          </div>

          <div>
            <label htmlFor="emp-email" className="mb-1.5 block text-sm text-zinc-400">
              Email
            </label>
            <input
              id="emp-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
              placeholder="email@company.com"
            />
          </div>

          <div>
            <label htmlFor="emp-dept" className="mb-1.5 block text-sm text-zinc-400">
              Department
            </label>
            <input
              id="emp-dept"
              type="text"
              required
              value={form.department}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, department: e.target.value }))
              }
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
              placeholder="Logistics, Operations..."
            />
          </div>

          <div>
            <label htmlFor="emp-rate" className="mb-1.5 block text-sm text-zinc-400">
              Hourly rate ($)
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
              disabled={isBusy}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-60"
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
              disabled={isBusy}
              className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {getSubmitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
