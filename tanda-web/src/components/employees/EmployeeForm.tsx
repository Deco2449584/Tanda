'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import {
  Briefcase,
  FileText,
  Mail,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { EmployeeDocumentUpload } from '@/components/employees/EmployeeDocumentUpload';
import {
  EmployeeAccessRoleSection,
  isKioskAccessRole,
} from '@/components/employees/EmployeeAccessRoleSection';
import { EmployeeLocationGroupSelect } from '@/components/employees/EmployeeLocationGroupSelect';
import { EmployeeLocationSelect } from '@/components/employees/EmployeeLocationSelect';
import { EmployeeDepartmentSelect } from '@/components/employees/EmployeeDepartmentSelect';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormSection,
  FormToggle,
  formInputClass,
} from '@/components/employees/employee-form-ui';
import { COLLECTIONS } from '@/lib/constants';
import {
  buildEmployeeCreatePayload,
  buildEmployeeUpdatePayload,
  initialCreateEmployeeForm,
} from '@/lib/employees/build-create-payload';
import {
  deriveAccessRole,
  employeeToFormValues,
} from '@/lib/employees/employee-to-form';
import { uploadEmployeeDocument } from '@/lib/employees/upload-document';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { requestEmployeeInvite } from '@/lib/employees/request-employee-invite';
import { requestKioskEmployeeAuth } from '@/lib/employees/request-kiosk-employee-auth';
import { requestEmployeeAdminAccess } from '@/lib/employees/request-admin-access';
import { recordEmployeeAuditEvent } from '@/lib/audit/audit-logs-client';
import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';
import { validateEmploymentDates } from '@/lib/employees/employment-dates';
import {
  isEmployeeIdTaken,
  suggestEmployeeId,
} from '@/lib/employees/suggest-employee-id';
import { suggestKioskAccountEmployeeId } from '@/lib/employees/suggest-kiosk-account-id';
import { normalizeKioskLoginEmail } from '@/lib/employees/normalize-kiosk-login-email';
import { requestSyncEmployeeAuth } from '@/lib/employees/request-sync-employee-auth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminRoleTemplates } from '@/hooks/useAdminRoleTemplates';
import { db } from '@/lib/firebase';
import { useLocations } from '@/providers/LocationsProvider';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { CreateEmployeeFormValues, Employee } from '@/lib/types/employee';

interface EmployeeFormProps {
  employee?: Employee | null;
  onCancel: () => void;
  onSuccess: () => void;
}

function formatInviteSentAt(timestamp?: Timestamp): string | null {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return null;
  }

  return timestamp.toDate().toLocaleString();
}

function isEmployeeIdTakenByOther(
  employees: Employee[],
  candidate: string,
  excludeDocId?: string,
): boolean {
  const normalized = candidate.trim();
  return employees.some(
    (item) =>
      item.id !== excludeDocId &&
      item.employeeId.trim() === normalized &&
      normalized.length > 0,
  );
}

export function EmployeeForm({ employee = null, onCancel, onSuccess }: EmployeeFormProps) {
  const isEditMode = Boolean(employee);
  const { activeLocations } = useLocations();
  const { settings } = useCompanySettings();
  const { employees, loading: employeesLoading, refresh: refreshEmployees } = useEmployees();
  const { isMaster, canPerformAction } = useAdminAccess();
  const canInviteEmployees = canPerformAction('employees', 'invite');
  const [form, setForm] = useState<CreateEmployeeFormValues>(initialCreateEmployeeForm);
  const [accessRole, setAccessRole] = useState<EmployeeAccessRole>('empleado');
  const [adminRoleId, setAdminRoleId] = useState('');
  const [active, setActive] = useState(true);
  const [kioskEnabled, setKioskEnabled] = useState(false);
  const { roles: adminRoleTemplates } = useAdminRoleTemplates(
    isMaster && accessRole === 'admin',
  );
  const [employeeIdEdited, setEmployeeIdEdited] = useState(isEditMode);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingInvite, setIsResendingInvite] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [kioskPassword, setKioskPassword] = useState('');
  const [kioskPasswordConfirm, setKioskPasswordConfirm] = useState('');
  const [error, setError] = useState('');

  const isBusy = isUploading || isSubmitting || isResendingInvite;
  const isKiosk = isKioskAccessRole(accessRole);

  function patchForm(patch: Partial<CreateEmployeeFormValues>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    if (!employee) {
      setForm(initialCreateEmployeeForm);
      setAccessRole('empleado');
      setAdminRoleId('');
      setActive(true);
      setKioskEnabled(false);
      setEmployeeIdEdited(false);
      setPhotoFile(null);
      setPassportFile(null);
      setVisaFile(null);
      setError('');
      setInviteMessage('');
      setKioskPassword('');
      setKioskPasswordConfirm('');
      return;
    }

    setForm(employeeToFormValues(employee));
    setAccessRole(deriveAccessRole(employee));
    setAdminRoleId(employee.adminRoleId ?? '');
    setActive(employee.active);
    setKioskEnabled(employee.kioskEnabled === true);
    setEmployeeIdEdited(true);
    setPhotoFile(null);
    setPassportFile(null);
    setVisaFile(null);
    setError('');
    setInviteMessage('');
    setKioskPassword('');
    setKioskPasswordConfirm('');
  }, [employee]);

  function applySuggestedEmployeeId() {
    try {
      const usedIds = employees
        .filter((item) => item.id !== employee?.id)
        .map((item) => item.employeeId);
      patchForm({ employeeId: suggestEmployeeId(usedIds) });
    } catch {
      setError('No available 4-digit employee IDs. Enter one manually.');
    }
  }

  useEffect(() => {
    if (isEditMode || employeeIdEdited || employeesLoading || isKiosk) return;

    setForm((current) => {
      if (current.employeeId.trim()) return current;
      try {
        return {
          ...current,
          employeeId: suggestEmployeeId(employees.map((item) => item.employeeId)),
        };
      } catch {
        return current;
      }
    });
  }, [employeeIdEdited, employees, employeesLoading, isEditMode, isKiosk]);

  useEffect(() => {
    if (isEditMode || !settings.defaultDepartmentName) return;

    setForm((current) => {
      if (current.department.trim()) return current;
      return { ...current, department: settings.defaultDepartmentName ?? '' };
    });
  }, [isEditMode, settings.defaultDepartmentName]);

  useEffect(() => {
    if (accessRole !== 'admin' || adminRoleId || adminRoleTemplates.length === 0) {
      return;
    }

    setAdminRoleId(adminRoleTemplates[0]!.id);
  }, [accessRole, adminRoleId, adminRoleTemplates]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!form.name.trim() || !form.email.trim()) {
      setError('Complete all required work details.');
      return;
    }

    if (!isKiosk && !form.employeeId.trim()) {
      setError('Complete all required work details.');
      return;
    }

    if (isKiosk) {
      if (!isEditMode && !kioskPassword.trim()) {
        setError('Set a sign-in password for this kiosk account.');
        return;
      }

      if (kioskPassword.trim() && kioskPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      if (!isEditMode && kioskPassword !== kioskPasswordConfirm) {
        setError('Passwords do not match.');
        return;
      }

      if (isEditMode && kioskPassword.trim() && kioskPassword !== kioskPasswordConfirm) {
        setError('Passwords do not match.');
        return;
      }
    }

    if (!isKiosk && form.hourlyRate <= 0) {
      setError('Hourly rate must be greater than zero.');
      return;
    }

    if (!isKiosk && activeLocations.length > 0 && !form.locationId?.trim()) {
      setError('Select a primary location for this employee.');
      return;
    }

    if (isMaster && accessRole === 'admin' && !adminRoleId.trim()) {
      setError('Select an access role template for administrators.');
      return;
    }

    let employeeCode = form.employeeId.trim();
    if (isKiosk) {
      if (!employeeCode) {
        try {
          employeeCode = suggestKioskAccountEmployeeId(
            employees.map((item) => item.employeeId),
          );
        } catch {
          setError('Could not generate an internal kiosk account ID. Try again.');
          return;
        }
      }

      if (
        isEmployeeIdTakenByOther(employees, employeeCode, employee?.id) ||
        (!isEditMode &&
          isEmployeeIdTaken(
            employees.map((item) => item.employeeId),
            employeeCode,
          ))
      ) {
        setError('Could not generate a unique kiosk account ID. Try again.');
        return;
      }
    } else if (
      isEmployeeIdTakenByOther(employees, employeeCode, employee?.id) ||
      (!isEditMode &&
        isEmployeeIdTaken(
          employees.map((item) => item.employeeId),
          employeeCode,
        ))
    ) {
      setError('This employee ID is already in use. Choose another one.');
      return;
    }

    const dateError = validateEmploymentDates(form.startDate ?? '', form.endDate ?? '');
    if (!isKiosk && dateError) {
      setError(dateError);
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl = employee?.photoUrl ?? '';
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

      const normalizedForm: CreateEmployeeFormValues = {
        ...form,
        employeeId: employeeCode,
        email: isKiosk ? normalizeKioskLoginEmail(form.email) : form.email.trim().toLowerCase(),
        department: isKiosk ? 'Kiosk' : form.department.trim(),
        hourlyRate: isKiosk ? 0 : form.hourlyRate,
        startDate: isKiosk ? undefined : form.startDate,
        endDate: isKiosk ? undefined : form.endDate,
        locationId: isKiosk ? '' : form.locationId,
        locationGroupId: isKiosk ? '' : form.locationGroupId,
      };

      if (isEditMode && employee) {
        const payload: Record<string, unknown> = buildEmployeeUpdatePayload({
          form: normalizedForm,
          active,
          kioskEnabled: isKiosk ? false : kioskEnabled,
          photoUrl: photoUrl || undefined,
          passport: isKiosk ? undefined : passport,
          visa: isKiosk ? undefined : visa,
        });

        if (!normalizedForm.locationId?.trim()) payload.locationId = deleteField();
        if (!normalizedForm.locationGroupId?.trim()) payload.locationGroupId = deleteField();
        if (!form.startDate?.trim()) payload.startDate = deleteField();
        if (!form.endDate?.trim()) payload.endDate = deleteField();

        const optionalPersonalFields = [
          'phone',
          'dateOfBirth',
          'addressLine1',
          'addressLine2',
          'city',
          'state',
          'postcode',
          'country',
          'emergencyContactName',
          'emergencyContactPhone',
          'passportNumber',
          'visaExpiry',
        ] as const;

        for (const field of optionalPersonalFields) {
          if (!form[field]?.trim()) {
            payload[field] = deleteField();
          }
        }

        if (!passport && !employee.passportUrl) {
          payload.passportUrl = deleteField();
          payload.passportFileName = deleteField();
        }

        if (!visa && !employee.visaUrl) {
          payload.visaUrl = deleteField();
          payload.visaFileName = deleteField();
        }

        await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id), payload);

        if (isMaster) {
          const initialAccessRole = deriveAccessRole(employee);
          const accessChanged =
            accessRole !== initialAccessRole ||
            (accessRole === 'admin' && adminRoleId !== (employee.adminRoleId ?? ''));

          if (accessChanged) {
            await requestEmployeeAdminAccess({
              employeeDocId: employee.id,
              accessRole,
              adminRoleId: accessRole === 'admin' ? adminRoleId : undefined,
            });
          }
        }

        if (isKiosk && kioskPassword.trim()) {
          await requestKioskEmployeeAuth({
            email: normalizedForm.email,
            name: form.name.trim(),
            password: kioskPassword,
            employeeDocId: employee.id,
          });
        }

        if (active !== employee.active) {
          await requestSyncEmployeeAuth(employee.id, active ? 'enable' : 'disable');
        }

        void recordEmployeeAuditEvent({
          action: 'employee.updated',
          employeeDocId: employee.id,
          summary: `Updated employee ${form.name.trim()} (${employeeCode})`,
        });

        await refreshEmployees();
      } else {
        const payload = buildEmployeeCreatePayload({
          form: normalizedForm,
          photoUrl: photoUrl || undefined,
          passport: isKiosk ? undefined : passport,
          visa: isKiosk ? undefined : visa,
        });

        payload.lastTimestampServer = serverTimestamp();

        const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), payload);

        if (isMaster && accessRole !== 'empleado') {
          await requestEmployeeAdminAccess({
            employeeDocId: docRef.id,
            accessRole,
            adminRoleId: accessRole === 'admin' ? adminRoleId : undefined,
          });
        }

        if (isKiosk) {
          await requestKioskEmployeeAuth({
            email: normalizedForm.email,
            name: form.name.trim(),
            password: kioskPassword,
            employeeDocId: docRef.id,
          });
        } else if (canInviteEmployees) {
          try {
            await requestEmployeeInvite({
              email: form.email.trim(),
              name: form.name.trim(),
              employeeDocId: docRef.id,
            });
          } catch (inviteError) {
            const message =
              inviteError instanceof Error
                ? inviteError.message
                : 'Could not send the invite email.';
            throw new Error(`Employee saved, but the invite email failed: ${message}`);
          }
        }

        void recordEmployeeAuditEvent({
          action: 'employee.created',
          employeeDocId: docRef.id,
          summary: `Created employee ${form.name.trim()} (${employeeCode})`,
        });

        await refreshEmployees();
      }

      onSuccess();
    } catch (submitError) {
      const rawMessage =
        submitError instanceof Error ? submitError.message : 'Unknown error';
      const permissionDenied =
        rawMessage.includes('permission') || rawMessage.includes('Permission');
      setError(
        permissionDenied
          ? 'Could not save: insufficient Firestore permissions. If this persists after updating rules, contact support.'
          : submitError instanceof Error
            ? rawMessage
            : isUploading
              ? 'Could not upload a file. Please try again.'
              : `Could not ${isEditMode ? 'update' : 'save'} the employee. Please try again.`,
      );
    } finally {
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }

  function getSubmitLabel() {
    if (isUploading) return 'Uploading files…';
    if (isSubmitting) return isEditMode ? 'Saving changes…' : 'Saving employee…';
    return isEditMode ? 'Save changes' : isKiosk ? 'Create kiosk account' : 'Create employee';
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <FormSection
        title="Work details"
        description={
          isKiosk
            ? 'Shared sign-in for kiosk tablets. Warehouse is chosen when the device starts.'
            : 'Core information used for scheduling, payroll, and kiosk access.'
        }
        icon={Briefcase}
      >
        {!isKiosk ? (
          <EmployeePhotoUpload
            currentPhotoUrl={employee?.photoUrl}
            selectedFile={photoFile}
            onFileChange={setPhotoFile}
            disabled={isBusy}
          />
        ) : null}

        <FormGrid>
          {!isKiosk ? (
            <FormField
              label="Employee ID"
              htmlFor="emp-id"
              required
              hint={
                isEditMode
                  ? 'Unique code used across scheduling and kiosk lookup.'
                  : 'Suggested automatically and unique among staff. You can edit it before saving.'
              }
            >
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
                  className={formInputClass}
                  placeholder="0045"
                />
                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeIdEdited(false);
                      applySuggestedEmployeeId();
                    }}
                    disabled={isBusy || employeesLoading}
                    title="Suggest another ID"
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-base/80 px-3 text-subtle transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </FormField>
          ) : null}

          <FormField
            label={isKiosk ? 'Device label' : 'Full name'}
            htmlFor="emp-name"
            required
            hint={isKiosk ? 'Shown in admin lists only, e.g. "Warehouse tablet".' : undefined}
          >
            <input
              id="emp-name"
              type="text"
              required
              value={form.name}
              onChange={(event) => patchForm({ name: event.target.value })}
              disabled={isBusy}
              className={formInputClass}
              placeholder={isKiosk ? 'Warehouse tablet' : 'Full name'}
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="emp-email"
            required
            hint={
              isKiosk
                ? 'Use any identifier — if you omit @, .local is added automatically for sign-in.'
                : undefined
            }
          >
            <input
              id="emp-email"
              type={isKiosk ? 'text' : 'email'}
              required
              autoComplete={isKiosk ? 'username' : 'email'}
              value={form.email}
              onChange={(event) => patchForm({ email: event.target.value })}
              disabled={isBusy}
              className={formInputClass}
              placeholder={isKiosk ? 'kiosk.warehouse@local' : 'email@company.com'}
            />
          </FormField>

          {isKiosk ? (
            <>
              <FormField
                label="Password"
                htmlFor="emp-kiosk-password"
                required={!isEditMode}
                hint={
                  isEditMode
                    ? 'Leave blank to keep the current password.'
                    : 'Used to sign in at /login on the kiosk tablet.'
                }
              >
                <input
                  id="emp-kiosk-password"
                  type="password"
                  required={!isEditMode}
                  autoComplete="new-password"
                  value={kioskPassword}
                  onChange={(event) => setKioskPassword(event.target.value)}
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder={isEditMode ? '••••••••' : 'At least 6 characters'}
                />
              </FormField>

              <FormField
                label="Confirm password"
                htmlFor="emp-kiosk-password-confirm"
                required={!isEditMode || Boolean(kioskPassword.trim())}
              >
                <input
                  id="emp-kiosk-password-confirm"
                  type="password"
                  required={!isEditMode || Boolean(kioskPassword.trim())}
                  autoComplete="new-password"
                  value={kioskPasswordConfirm}
                  onChange={(event) => setKioskPasswordConfirm(event.target.value)}
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder="Repeat password"
                />
              </FormField>
            </>
          ) : null}

          {!isKiosk ? (
            <EmployeeDepartmentSelect
              id="emp-dept"
              value={form.department}
              onChange={(department) => patchForm({ department })}
              disabled={isBusy}
              allowUnassigned
            />
          ) : null}

          {isMaster ? (
            <div className="md:col-span-2">
              <EmployeeAccessRoleSection
                accessRole={accessRole}
                adminRoleId={adminRoleId}
                onAccessRoleChange={setAccessRole}
                onAdminRoleIdChange={setAdminRoleId}
                disabled={isBusy}
              />
            </div>
          ) : null}

          {!isKiosk ? (
            <>
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

              <FormField label="Hourly rate ($)" htmlFor="emp-rate" required>
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
                  className={formInputClass}
                  placeholder="18.50"
                />
              </FormField>

              <FormField label="Start date" htmlFor="emp-start-date" required>
                <input
                  id="emp-start-date"
                  type="date"
                  required
                  value={form.startDate ?? ''}
                  onChange={(event) => patchForm({ startDate: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField
                label="End date"
                htmlFor="emp-end-date"
                hint="Leave blank while employed. Set when the employee resigns or leaves."
              >
                <input
                  id="emp-end-date"
                  type="date"
                  value={form.endDate ?? ''}
                  onChange={(event) => patchForm({ endDate: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>
            </>
          ) : null}
        </FormGrid>

        {isEditMode && employee && canInviteEmployees && !isKiosk ? (
          <div className="rounded-xl border border-border/80 bg-surface-base/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Sign-in invite</p>
                <p className="mt-1 text-xs text-subtle">
                  Sends an email with a link to set a password and sign in.
                </p>
                {formatInviteSentAt(employee.inviteSentAt) ? (
                  <p className="mt-2 text-xs text-muted">
                    Last sent: {formatInviteSentAt(employee.inviteSentAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted">No invite sent yet.</p>
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
        ) : null}

        {isEditMode ? (
          <div className="grid gap-4 md:grid-cols-2">
            <FormToggle
              label="Active employee"
              description="Inactive employees are hidden from scheduling and kiosk PIN lookup."
              checked={active}
              onChange={setActive}
              disabled={isBusy}
            />
            {!isKiosk ? (
              <FormToggle
                label="Kiosk access"
                description="Lets this employee open the /kiosk check-in module from their own device."
                checked={kioskEnabled}
                onChange={setKioskEnabled}
                disabled={isBusy}
              />
            ) : null}
          </div>
        ) : null}
      </FormSection>

      {!isKiosk ? (
        <>
          <FormSection
            title="Personal details"
            description="Contact information and home address for the employee file."
            icon={UserRound}
          >
            <FormGrid>
              <FormField label="Phone" htmlFor="emp-phone">
                <input
                  id="emp-phone"
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(event) => patchForm({ phone: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder="+61 400 000 000"
                />
              </FormField>

              <FormField label="Date of birth" htmlFor="emp-dob">
                <input
                  id="emp-dob"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(event) => patchForm({ dateOfBirth: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="Address line 1" htmlFor="emp-address-1" className="md:col-span-2">
                <input
                  id="emp-address-1"
                  type="text"
                  value={form.addressLine1 ?? ''}
                  onChange={(event) => patchForm({ addressLine1: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder="Street and number"
                />
              </FormField>

              <FormField label="Address line 2" htmlFor="emp-address-2" className="md:col-span-2">
                <input
                  id="emp-address-2"
                  type="text"
                  value={form.addressLine2 ?? ''}
                  onChange={(event) => patchForm({ addressLine2: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder="Unit, building, etc."
                />
              </FormField>

              <FormField label="City" htmlFor="emp-city">
                <input
                  id="emp-city"
                  type="text"
                  value={form.city ?? ''}
                  onChange={(event) => patchForm({ city: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="State / region" htmlFor="emp-state">
                <input
                  id="emp-state"
                  type="text"
                  value={form.state ?? ''}
                  onChange={(event) => patchForm({ state: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="Postcode" htmlFor="emp-postcode">
                <input
                  id="emp-postcode"
                  type="text"
                  value={form.postcode ?? ''}
                  onChange={(event) => patchForm({ postcode: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="Country" htmlFor="emp-country">
                <input
                  id="emp-country"
                  type="text"
                  value={form.country ?? ''}
                  onChange={(event) => patchForm({ country: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="Emergency contact" htmlFor="emp-emergency-name">
                <input
                  id="emp-emergency-name"
                  type="text"
                  value={form.emergencyContactName ?? ''}
                  onChange={(event) =>
                    patchForm({ emergencyContactName: event.target.value })
                  }
                  disabled={isBusy}
                  className={formInputClass}
                  placeholder="Contact name"
                />
              </FormField>

              <FormField label="Emergency phone" htmlFor="emp-emergency-phone">
                <input
                  id="emp-emergency-phone"
                  type="tel"
                  value={form.emergencyContactPhone ?? ''}
                  onChange={(event) =>
                    patchForm({ emergencyContactPhone: event.target.value })
                  }
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection
            title="Identity documents"
            description="Attach passport and visa files. Images or PDF up to 10 MB."
            icon={FileText}
          >
            <FormGrid>
              <FormField label="Passport number" htmlFor="emp-passport-number">
                <input
                  id="emp-passport-number"
                  type="text"
                  value={form.passportNumber ?? ''}
                  onChange={(event) => patchForm({ passportNumber: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>

              <FormField label="Visa expiry" htmlFor="emp-visa-expiry">
                <input
                  id="emp-visa-expiry"
                  type="date"
                  value={form.visaExpiry ?? ''}
                  onChange={(event) => patchForm({ visaExpiry: event.target.value })}
                  disabled={isBusy}
                  className={formInputClass}
                />
              </FormField>
            </FormGrid>

            <FormGrid>
              <EmployeeDocumentUpload
                label="Passport"
                description="Scan or photo of the passport identity page."
                currentFileName={employee?.passportFileName}
                selectedFile={passportFile}
                onFileChange={setPassportFile}
                disabled={isBusy}
              />
              <EmployeeDocumentUpload
                label="Visa"
                description="Work visa or residency document."
                currentFileName={employee?.visaFileName}
                selectedFile={visaFile}
                onFileChange={setVisaFile}
                disabled={isBusy}
              />
            </FormGrid>
          </FormSection>
        </>
      ) : null}

      {error ? <FormAlert variant="error">{error}</FormAlert> : null}

      <FormActions
        onCancel={onCancel}
        submitLabel={getSubmitLabel()}
        disabled={isBusy}
      />
    </form>
  );
}
