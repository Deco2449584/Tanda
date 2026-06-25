'use client';

import { FormEvent, useEffect, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import { EmployeeLocationGroupSelect } from '@/components/employees/EmployeeLocationGroupSelect';
import { EmployeeLocationSelect } from '@/components/employees/EmployeeLocationSelect';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import { COLLECTIONS } from '@/lib/constants';
import { isProtectedAdminEmployee } from '@/lib/employees/is-protected-admin';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { db } from '@/lib/firebase';
import { useLocations } from '@/providers/LocationsProvider';
import type { CreateEmployeeInput, Employee } from '@/lib/types/employee';

interface EditEmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
}

export function EditEmployeeModal({ employee, onClose }: EditEmployeeModalProps) {
  const { activeLocations } = useLocations();
  const [form, setForm] = useState<CreateEmployeeInput>({
    employeeId: '',
    name: '',
    email: '',
    department: '',
    locationId: '',
    locationGroupId: '',
    hourlyRate: 0,
  });
  const [active, setActive] = useState(true);
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isBusy = isUploading || isSubmitting;

  useEffect(() => {
    if (!employee) return;

    setForm({
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      locationId: employee.locationId ?? '',
      locationGroupId: employee.locationGroupId ?? '',
      hourlyRate: employee.hourlyRate,
    });
    setActive(employee.active);
    setKioskEnabled(employee.kioskEnabled === true);
    setPhotoFile(null);
    setError('');
  }, [employee]);

  if (!employee) return null;

  function handleClose() {
    if (isBusy) return;
    setPhotoFile(null);
    setError('');
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!employee) return;

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

    if (activeLocations.length > 0 && !form.locationId?.trim()) {
      setError('Select a primary location for this employee.');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = employee.photoUrl ?? '';

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
        active,
        kioskEnabled,
      };

      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }

      if (form.locationId?.trim()) {
        payload.locationId = form.locationId.trim();
      } else {
        payload.locationId = deleteField();
      }

      if (form.locationGroupId?.trim()) {
        payload.locationGroupId = form.locationGroupId.trim();
      } else {
        payload.locationGroupId = deleteField();
      }

      await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), payload);

      setPhotoFile(null);
      onClose();
    } catch {
      setError(
        isUploading
          ? 'Could not upload the image. Please try again.'
          : 'Could not update the employee. Please try again.',
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  function getSubmitLabel() {
    if (isUploading) return 'Uploading image...';
    if (isSubmitting) return 'Saving changes...';
    return 'Save changes';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-employee-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 max-h-[90vh] w-[95%] overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="edit-employee-title" className="text-lg font-semibold text-white">
            Edit employee
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <EmployeePhotoUpload
            currentPhotoUrl={employee.photoUrl}
            selectedFile={photoFile}
            onFileChange={setPhotoFile}
            disabled={isBusy}
          />

          <div>
            <label htmlFor="edit-emp-id" className="mb-1.5 block text-sm text-muted">
              Employee ID
            </label>
            <input
              id="edit-emp-id"
              type="text"
              required
              value={form.employeeId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-emp-name" className="mb-1.5 block text-sm text-muted">
              Name
            </label>
            <input
              id="edit-emp-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-emp-email" className="mb-1.5 block text-sm text-muted">
              Email
            </label>
            <input
              id="edit-emp-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-emp-dept" className="mb-1.5 block text-sm text-muted">
              Department
            </label>
            <input
              id="edit-emp-dept"
              type="text"
              required
              value={form.department}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, department: e.target.value }))
              }
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <EmployeeLocationSelect
            id="edit-emp-location"
            value={form.locationId ?? ''}
            onChange={(locationId) =>
              setForm((prev) => ({ ...prev, locationId }))
            }
            disabled={isBusy}
            required={activeLocations.length > 0}
          />

          <EmployeeLocationGroupSelect
            id="edit-emp-location-group"
            value={form.locationGroupId ?? ''}
            onChange={(locationGroupId) =>
              setForm((prev) => ({ ...prev, locationGroupId }))
            }
            disabled={isBusy}
          />

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-base/60 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active employee</p>
              <p className="mt-0.5 text-xs text-subtle">
                Inactive employees are hidden from scheduling and kiosk PIN lookup.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={active ? 'Employee is active' : 'Employee is inactive'}
              disabled={isBusy}
              onClick={() => setActive((prev) => !prev)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                active ? 'bg-primary' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-base/60 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Kiosk access</p>
              <p className="mt-0.5 text-xs text-subtle">
                Lets this employee open the /kiosk check-in module from their own device.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={kioskEnabled}
              aria-label={kioskEnabled ? 'Kiosk access enabled' : 'Kiosk access disabled'}
              disabled={isBusy}
              onClick={() => setKioskEnabled((prev) => !prev)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                kioskEnabled ? 'bg-primary' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  kioskEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="edit-emp-rate" className="mb-1.5 block text-sm text-muted">
              Hourly rate ($)
            </label>
            <input
              id="edit-emp-rate"
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
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
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
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm font-medium text-muted transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {getSubmitLabel()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
