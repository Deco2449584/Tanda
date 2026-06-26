'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';
import { EmployeeDocumentUpload } from '@/components/employees/EmployeeDocumentUpload';
import { EmployeeLocationGroupSelect } from '@/components/employees/EmployeeLocationGroupSelect';
import { EmployeeLocationSelect } from '@/components/employees/EmployeeLocationSelect';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import { COLLECTIONS } from '@/lib/constants';
import {
  buildEmployeeCreatePayload,
  initialCreateEmployeeForm,
} from '@/lib/employees/build-create-payload';
import { uploadEmployeeDocument } from '@/lib/employees/upload-document';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { auth } from '@/lib/firebase';
import { validateEmploymentDates } from '@/lib/employees/employment-dates';
import {
  isEmployeeIdTaken,
  suggestEmployeeId,
} from '@/lib/employees/suggest-employee-id';
import { db } from '@/lib/firebase';
import { useLocations } from '@/providers/LocationsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { CreateEmployeeFormValues } from '@/lib/types/employee';

interface CreateEmployeeFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60';

const labelClass = 'mb-1.5 block text-sm text-muted';

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-subtle">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function CreateEmployeeForm({ onCancel, onSuccess }: CreateEmployeeFormProps) {
  const { activeLocations } = useLocations();
  const { employees, loading: employeesLoading } = useEmployees();
  const [form, setForm] = useState<CreateEmployeeFormValues>(initialCreateEmployeeForm);
  const [employeeIdEdited, setEmployeeIdEdited] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isBusy = isUploading || isSubmitting;

  function patchForm(patch: Partial<CreateEmployeeFormValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function applySuggestedEmployeeId() {
    try {
      const usedIds = employees.map((employee) => employee.employeeId);
      patchForm({ employeeId: suggestEmployeeId(usedIds) });
    } catch {
      setError('No available 4-digit employee IDs. Enter one manually.');
    }
  }

  useEffect(() => {
    if (employeeIdEdited || employeesLoading) return;

    setForm((current) => {
      if (current.employeeId.trim()) return current;
      try {
        return {
          ...current,
          employeeId: suggestEmployeeId(employees.map((employee) => employee.employeeId)),
        };
      } catch {
        return current;
      }
    });
  }, [employees, employeesLoading, employeeIdEdited]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setError('Complete all required work details.');
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

    const employeeCode = form.employeeId.trim();
    if (isEmployeeIdTaken(employees.map((employee) => employee.employeeId), employeeCode)) {
      setError('This employee ID is already in use. Choose another one.');
      return;
    }

    const dateError = validateEmploymentDates(form.startDate ?? '', form.endDate ?? '');
    if (dateError) {
      setError(dateError);
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = '';
      let passport: { url: string; fileName: string } | undefined;
      let visa: { url: string; fileName: string } | undefined;

      if (photoFile || passportFile || visaFile) {
        setIsUploading(true);
      }

      if (photoFile) {
        photoUrl = await uploadEmployeeAvatar(employeeCode, photoFile);
      }

      if (passportFile) {
        passport = await uploadEmployeeDocument(employeeCode, passportFile, 'passport');
      }

      if (visaFile) {
        visa = await uploadEmployeeDocument(employeeCode, visaFile, 'visa');
      }

      setIsUploading(false);

      const payload = buildEmployeeCreatePayload({
        form,
        photoUrl: photoUrl || undefined,
        passport,
        visa,
      });

      payload.lastTimestampServer = serverTimestamp();

      const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), payload);

      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('Employee saved, but your session expired before the invite could be sent.');
      }

      const idToken = await currentUser.getIdToken();
      const inviteResponse = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          name: form.name.trim(),
          employeeDocId: docRef.id,
        }),
      });

      if (!inviteResponse.ok) {
        const inviteData = (await inviteResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          inviteData?.error
            ? `Employee saved, but the invite email failed: ${inviteData.error}`
            : 'Employee saved, but the invite email could not be sent.',
        );
      }

      onSuccess();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isUploading
            ? 'Could not upload a file. Please try again.'
            : 'Could not save the employee. Please try again.',
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  function getSubmitLabel() {
    if (isUploading) return 'Uploading files…';
    if (isSubmitting) return 'Saving employee…';
    return 'Create employee';
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <FormSection
        title="Work details"
        description="Core information used for scheduling, payroll, and kiosk access."
      >
        <EmployeePhotoUpload
          selectedFile={photoFile}
          onFileChange={setPhotoFile}
          disabled={isBusy}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="emp-id" className={labelClass}>
              Employee ID <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="emp-id"
                type="text"
                required
                inputMode="numeric"
                value={form.employeeId}
                onChange={(event) => {
                  setEmployeeIdEdited(true);
                  patchForm({ employeeId: event.target.value });
                }}
                disabled={isBusy}
                className={inputClass}
                placeholder="0045"
              />
              <button
                type="button"
                onClick={() => {
                  setEmployeeIdEdited(false);
                  applySuggestedEmployeeId();
                }}
                disabled={isBusy || employeesLoading}
                title="Suggest another ID"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-base px-3 text-subtle transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-xs text-subtle">
              Suggested automatically and unique among staff. You can edit it before saving.
            </p>
          </div>

          <div>
            <label htmlFor="emp-name" className={labelClass}>
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              id="emp-name"
              type="text"
              required
              value={form.name}
              onChange={(event) => patchForm({ name: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="Full name"
            />
          </div>

          <div>
            <label htmlFor="emp-email" className={labelClass}>
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="emp-email"
              type="email"
              required
              value={form.email}
              onChange={(event) => patchForm({ email: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="email@company.com"
            />
          </div>

          <div>
            <label htmlFor="emp-dept" className={labelClass}>
              Department <span className="text-red-400">*</span>
            </label>
            <input
              id="emp-dept"
              type="text"
              required
              value={form.department}
              onChange={(event) => patchForm({ department: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="Logistics, Operations…"
            />
          </div>

          <EmployeeLocationSelect
            id="emp-location"
            value={form.locationId ?? ''}
            onChange={(locationId) => patchForm({ locationId })}
            disabled={isBusy}
            required={activeLocations.length > 0}
          />

          <EmployeeLocationGroupSelect
            id="emp-location-group"
            value={form.locationGroupId ?? ''}
            onChange={(locationGroupId) => patchForm({ locationGroupId })}
            disabled={isBusy}
          />

          <div>
            <label htmlFor="emp-rate" className={labelClass}>
              Hourly rate ($) <span className="text-red-400">*</span>
            </label>
            <input
              id="emp-rate"
              type="number"
              required
              min="0"
              step="0.01"
              value={form.hourlyRate || ''}
              onChange={(event) =>
                patchForm({ hourlyRate: parseFloat(event.target.value) || 0 })
              }
              disabled={isBusy}
              className={inputClass}
              placeholder="18.50"
            />
          </div>

          <div>
            <label htmlFor="emp-start-date" className={labelClass}>
              Start date <span className="text-red-400">*</span>
            </label>
            <input
              id="emp-start-date"
              type="date"
              required
              value={form.startDate ?? ''}
              onChange={(event) => patchForm({ startDate: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-end-date" className={labelClass}>
              End date
            </label>
            <input
              id="emp-end-date"
              type="date"
              value={form.endDate ?? ''}
              onChange={(event) => patchForm({ endDate: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-subtle">
              Leave blank while employed. Set when the employee resigns or leaves.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Personal details"
        description="Contact information and home address for the employee file."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="emp-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="emp-phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(event) => patchForm({ phone: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="+61 400 000 000"
            />
          </div>

          <div>
            <label htmlFor="emp-dob" className={labelClass}>
              Date of birth
            </label>
            <input
              id="emp-dob"
              type="date"
              value={form.dateOfBirth ?? ''}
              onChange={(event) => patchForm({ dateOfBirth: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="emp-address-1" className={labelClass}>
              Address line 1
            </label>
            <input
              id="emp-address-1"
              type="text"
              value={form.addressLine1 ?? ''}
              onChange={(event) => patchForm({ addressLine1: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="Street and number"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="emp-address-2" className={labelClass}>
              Address line 2
            </label>
            <input
              id="emp-address-2"
              type="text"
              value={form.addressLine2 ?? ''}
              onChange={(event) => patchForm({ addressLine2: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="Unit, building, etc."
            />
          </div>

          <div>
            <label htmlFor="emp-city" className={labelClass}>
              City
            </label>
            <input
              id="emp-city"
              type="text"
              value={form.city ?? ''}
              onChange={(event) => patchForm({ city: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-state" className={labelClass}>
              State / region
            </label>
            <input
              id="emp-state"
              type="text"
              value={form.state ?? ''}
              onChange={(event) => patchForm({ state: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-postcode" className={labelClass}>
              Postcode
            </label>
            <input
              id="emp-postcode"
              type="text"
              value={form.postcode ?? ''}
              onChange={(event) => patchForm({ postcode: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-country" className={labelClass}>
              Country
            </label>
            <input
              id="emp-country"
              type="text"
              value={form.country ?? ''}
              onChange={(event) => patchForm({ country: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-emergency-name" className={labelClass}>
              Emergency contact
            </label>
            <input
              id="emp-emergency-name"
              type="text"
              value={form.emergencyContactName ?? ''}
              onChange={(event) => patchForm({ emergencyContactName: event.target.value })}
              disabled={isBusy}
              className={inputClass}
              placeholder="Contact name"
            />
          </div>

          <div>
            <label htmlFor="emp-emergency-phone" className={labelClass}>
              Emergency phone
            </label>
            <input
              id="emp-emergency-phone"
              type="tel"
              value={form.emergencyContactPhone ?? ''}
              onChange={(event) => patchForm({ emergencyContactPhone: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Identity documents"
        description="Attach passport and visa files. Images or PDF up to 10 MB."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="emp-passport-number" className={labelClass}>
              Passport number
            </label>
            <input
              id="emp-passport-number"
              type="text"
              value={form.passportNumber ?? ''}
              onChange={(event) => patchForm({ passportNumber: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="emp-visa-expiry" className={labelClass}>
              Visa expiry
            </label>
            <input
              id="emp-visa-expiry"
              type="date"
              value={form.visaExpiry ?? ''}
              onChange={(event) => patchForm({ visaExpiry: event.target.value })}
              disabled={isBusy}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EmployeeDocumentUpload
            label="Passport"
            description="Scan or photo of the passport identity page."
            selectedFile={passportFile}
            onFileChange={setPassportFile}
            disabled={isBusy}
          />
          <EmployeeDocumentUpload
            label="Visa"
            description="Work visa or residency document."
            selectedFile={visaFile}
            onFileChange={setVisaFile}
            disabled={isBusy}
          />
        </div>
      </FormSection>

      {error ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-3 rounded-2xl border border-border bg-surface-raised/95 p-4 backdrop-blur sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border-strong px-5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {getSubmitLabel()}
        </button>
      </div>
    </form>
  );
}
