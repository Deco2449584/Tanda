'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmployeePersonalFields } from '@/components/employees/EmployeePersonalFields';
import { PersonalProfileStatusBadge } from '@/components/employees/PersonalProfileStatusBadge';
import { FormAlert, FormActions } from '@/components/employees/employee-form-ui';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { submitEmployeeProfileRequest } from '@/lib/employees/employee-profile-api';
import { employeeToFormValues } from '@/lib/employees/employee-to-form';
import { normalizePersonalProfileStatus } from '@/lib/employees/personal-profile-status';
import { uploadEmployeeDocument } from '@/lib/employees/upload-document';
import { initialCreateEmployeeForm } from '@/lib/employees/build-create-payload';
import type { CreateEmployeeFormValues } from '@/lib/types/employee';

export default function MyProfilePage() {
  const { user, loading: authLoading } = useAuthRole();
  const {
    employee,
    loading: employeeLoading,
    error: employeeError,
    refresh,
  } = useCurrentEmployee(user?.email);

  const [form, setForm] = useState<CreateEmployeeFormValues>(initialCreateEmployeeForm);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!employee) {
      setForm(initialCreateEmployeeForm);
      return;
    }
    setForm(employeeToFormValues(employee));
    setPassportFile(null);
    setVisaFile(null);
  }, [employee]);

  const patchForm = useCallback((patch: Partial<CreateEmployeeFormValues>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee) return;

    const currentStatus = normalizePersonalProfileStatus(
      employee.personalProfileStatus,
    );
    if (currentStatus === 'Approved') {
      return;
    }

    setError('');
    setSuccess('');

    const hasPassport = Boolean(passportFile || employee.passportUrl);
    const hasVisa = Boolean(visaFile || employee.visaUrl);
    if (!hasPassport || !hasVisa) {
      setError('Passport and visa documents are required before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      let passportUrl = employee.passportUrl ?? '';
      let passportFileName = employee.passportFileName;
      let visaUrl = employee.visaUrl ?? '';
      let visaFileName = employee.visaFileName;

      if (passportFile) {
        const uploaded = await uploadEmployeeDocument(
          employee.employeeId,
          passportFile,
          'passport',
        );
        passportUrl = uploaded.url;
        passportFileName = uploaded.fileName;
      }

      if (visaFile) {
        const uploaded = await uploadEmployeeDocument(
          employee.employeeId,
          visaFile,
          'visa',
        );
        visaUrl = uploaded.url;
        visaFileName = uploaded.fileName;
      }

      await submitEmployeeProfileRequest({
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
        country: form.country,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        passportNumber: form.passportNumber,
        visaExpiry: form.visaExpiry,
        passportUrl,
        visaUrl,
        passportFileName,
        visaFileName,
      });

      setPassportFile(null);
      setVisaFile(null);
      setSuccess('Profile submitted for admin review.');
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit your profile.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = authLoading || employeeLoading;
  const profileStatus = normalizePersonalProfileStatus(employee?.personalProfileStatus);
  const isReadOnly = profileStatus === 'Approved';
  const busy = isSubmitting || loading || isReadOnly;

  return (
    <PageContent className="space-y-6">
      <PageHeader title="My profile" />

      {loading ? (
        <p className="text-sm text-muted">Loading your profile…</p>
      ) : employeeError || !employee ? (
        <FormAlert variant="error">
          {employeeError || 'No employee profile found for this account.'}
        </FormAlert>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-surface-raised/60 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-foreground">Review status</p>
              <PersonalProfileStatusBadge status={profileStatus} />
            </div>
            {isReadOnly ? (
              <p className="text-xs text-subtle">
                Your profile is approved. You can view your details here; contact an
                administrator if something needs to change.
              </p>
            ) : (
              <p className="text-xs text-subtle">
                Complete your personal details and upload passport and visa documents, then
                submit for admin approval.
              </p>
            )}
            {profileStatus === 'Rejected' && employee.personalProfileRejectionReason ? (
              <p className="text-xs text-red-300/90">
                Rejection reason: {employee.personalProfileRejectionReason}
              </p>
            ) : null}
          </div>

          <EmployeePersonalFields
            form={form}
            onChange={patchForm}
            disabled={busy}
            readOnly={isReadOnly}
            idPrefix="my-profile"
            passportFile={passportFile}
            visaFile={visaFile}
            onPassportFileChange={setPassportFile}
            onVisaFileChange={setVisaFile}
            currentPassportFileName={employee.passportFileName}
            currentVisaFileName={employee.visaFileName}
            currentPassportUrl={employee.passportUrl}
            currentVisaUrl={employee.visaUrl}
            requireDocuments={!isReadOnly}
          />

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          {!isReadOnly ? (
            <FormActions
              submitLabel={isSubmitting ? 'Submitting…' : 'Submit for review'}
              disabled={busy}
              hideCancel
            />
          ) : null}
        </form>
      )}
    </PageContent>
  );
}
