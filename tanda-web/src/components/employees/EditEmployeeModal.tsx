'use client';

import { FormEvent, useEffect, useState } from 'react';
import { deleteField, doc, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { Mail, X } from 'lucide-react';
import {
  EmployeeAccessRoleSection,
  isKioskAccessRole,
} from '@/components/employees/EmployeeAccessRoleSection';
import { EmployeeLocationGroupSelect } from '@/components/employees/EmployeeLocationGroupSelect';
import { EmployeeLocationSelect } from '@/components/employees/EmployeeLocationSelect';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import {
  requestEmployeeAdminAccess,
  type EmployeeAccessRole,
} from '@/lib/employees/request-admin-access';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { COLLECTIONS } from '@/lib/constants';
import { isProtectedAdminEmployee } from '@/lib/employees/is-protected-admin';
import { validateEmploymentDates } from '@/lib/employees/employment-dates';
import { requestSyncEmployeeAuth } from '@/lib/employees/request-sync-employee-auth';
import { requestEmployeeInvite } from '@/lib/employees/request-employee-invite';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { db } from '@/lib/firebase';
import { useLocations } from '@/providers/LocationsProvider';
import type { CreateEmployeeInput, Employee } from '@/lib/types/employee';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';

interface EditEmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
}

function deriveAccessRole(employee: Employee): EmployeeAccessRole {
  const raw = employee.role?.trim().toLowerCase();
  if (raw === 'master') return 'master';
  if (raw === 'admin') return 'admin';
  if (raw === 'kiosk') return 'kiosk';
  if (resolveRoleFromEmployee(employee) === 'admin') return 'admin';
  return 'empleado';
}

export function EditEmployeeModal({ employee, onClose }: EditEmployeeModalProps) {
  const { isMaster } = useAdminAccess();
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [error, setError] = useState('');
  const [accessRole, setAccessRole] = useState<EmployeeAccessRole>('empleado');
  const [modulePermissions, setModulePermissions] =
    useState<AdminModulePermissionsFirestore>(mapModulePermissions(null));

  const isBusy = isUploading || isSubmitting || isResendingInvite;

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
    setStartDate(employee.startDate ?? '');
    setEndDate(employee.endDate ?? '');
    setPhotoFile(null);
    setError('');
    setInviteMessage('');
    setAccessRole(deriveAccessRole(employee));
    setModulePermissions(mapModulePermissions(employee.modulePermissions));
  }, [employee]);

  if (!employee) return null;

  const isKiosk = isKioskAccessRole(accessRole);

  function handleClose() {
    if (isBusy) return;
    setPhotoFile(null);
    setError('');
    setInviteMessage('');
    onClose();
  }

  function formatInviteSentAt(timestamp?: Timestamp): string | null {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return null;
    }

    return timestamp.toDate().toLocaleString();
  }

  async function handleResendInvite() {
    if (!employee) return;

    setError('');
    setInviteMessage('');

    if (!form.email.trim() || !form.name.trim()) {
      setError('Email and name are required to send an invite.');
      return;
    }

    setIsResendingInvite(true);

    try {
      await requestEmployeeInvite({
        email: form.email.trim(),
        name: form.name.trim(),
        employeeDocId: employee.id,
      });
      setInviteMessage(`Invite sent to ${form.email.trim().toLowerCase()}.`);
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Could not send the invite email.',
      );
    } finally {
      setIsResendingInvite(false);
    }
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
      (!isKiosk && !form.department.trim())
    ) {
      setError('Complete all required fields.');
      return;
    }

    if (!isKiosk && form.hourlyRate <= 0) {
      setError('Hourly rate must be greater than zero.');
      return;
    }

    if (!isKiosk && activeLocations.length > 0 && !form.locationId?.trim()) {
      setError('Select a primary location for this employee.');
      return;
    }

    const dateError = validateEmploymentDates(startDate, endDate);
    if (!isKiosk && dateError) {
      setError(dateError);
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
        department: isKiosk ? 'Kiosk' : form.department.trim(),
        hourlyRate: isKiosk ? 0 : form.hourlyRate,
        active,
        kioskEnabled: isKiosk ? false : kioskEnabled,
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

      if (startDate.trim()) {
        payload.startDate = startDate.trim();
      } else {
        payload.startDate = deleteField();
      }

      if (endDate.trim()) {
        payload.endDate = endDate.trim();
      } else {
        payload.endDate = deleteField();
      }

      await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), payload);

      if (isMaster) {
        const initialAccessRole = deriveAccessRole(employee);
        const initialPermissions = mapModulePermissions(employee.modulePermissions);
        const accessChanged =
          accessRole !== initialAccessRole ||
          JSON.stringify(modulePermissions) !== JSON.stringify(initialPermissions);

        if (accessChanged) {
          await requestEmployeeAdminAccess({
            employeeDocId: employee.id,
            accessRole,
            modulePermissions: accessRole === 'admin' ? modulePermissions : undefined,
          });
        }
      }

      if (active !== employee.active) {
        await requestSyncEmployeeAuth(employee.id, active ? 'enable' : 'disable');
      }

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

          <div className="rounded-lg border border-border bg-surface-base/60 px-3 py-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Sign-in invite</p>
                <p className="mt-0.5 text-xs text-subtle">
                  Sends an email with a link to set a password and sign in.
                </p>
                {formatInviteSentAt(employee.inviteSentAt) ? (
                  <p className="mt-1.5 text-xs text-muted">
                    Last sent: {formatInviteSentAt(employee.inviteSentAt)}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">No invite sent yet.</p>
                )}
                {inviteMessage ? (
                  <p className="mt-2 text-xs font-medium text-emerald-400" role="status">
                    {inviteMessage}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleResendInvite()}
                  disabled={isBusy}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-border-strong px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResendingInvite ? 'Sending invite…' : 'Resend invitation'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-emp-dept" className="mb-1.5 block text-sm text-muted">
              Department
            </label>
            <input
              id="edit-emp-dept"
              type="text"
              required={!isKiosk}
              value={isKiosk ? 'Kiosk' : form.department}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, department: e.target.value }))
              }
              disabled={isBusy || isKiosk}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          {isMaster ? (
            <EmployeeAccessRoleSection
              accessRole={accessRole}
              modulePermissions={modulePermissions}
              onAccessRoleChange={setAccessRole}
              onModulePermissionsChange={setModulePermissions}
              disabled={isBusy}
            />
          ) : null}

          {!isKiosk ? (
            <>
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

          <div>
            <label htmlFor="edit-emp-start-date" className="mb-1.5 block text-sm text-muted">
              Start date
            </label>
            <input
              id="edit-emp-start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-emp-end-date" className="mb-1.5 block text-sm text-muted">
              End date
            </label>
            <input
              id="edit-emp-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isBusy}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <p className="mt-1.5 text-xs text-subtle">
              Set when the employee resigns or leaves. Clear to mark as currently employed.
            </p>
          </div>
            </>
          ) : (
            <EmployeeLocationSelect
              id="edit-emp-location"
              value={form.locationId ?? ''}
              onChange={(locationId) =>
                setForm((prev) => ({ ...prev, locationId }))
              }
              disabled={isBusy}
            />
          )}

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

          {!isKiosk ? (
            <>
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
            </>
          ) : null}

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
