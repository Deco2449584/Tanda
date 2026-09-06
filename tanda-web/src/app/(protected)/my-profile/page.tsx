'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  EmployeeCustomFieldsForm,
  buildCustomFieldValuePayloads,
  isOptionalMissingDocumentField,
  type CustomFieldDraft,
} from '@/components/employees/EmployeeCustomFieldsForm';
import { EmployeePersonalFields } from '@/components/employees/EmployeePersonalFields';
import { EmployeePhotoUpload } from '@/components/employees/EmployeePhotoUpload';
import { PersonalProfileStatusBadge } from '@/components/employees/PersonalProfileStatusBadge';
import { FormAlert, FormActions, FormSection } from '@/components/employees/employee-form-ui';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import {
  fetchEmployeeCustomFieldValues,
  fetchEmployeeCustomFields,
  saveEmployeeCustomFieldValuesRequest,
} from '@/lib/employees/employee-custom-fields-api';
import { submitEmployeeProfileRequest } from '@/lib/employees/employee-profile-api';
import { employeeToFormValues } from '@/lib/employees/employee-to-form';
import { normalizePersonalProfileStatus } from '@/lib/employees/personal-profile-status';
import { validatePersonalDetails } from '@/lib/employees/validate-personal-details';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { uploadEmployeeDocument } from '@/lib/employees/upload-document';
import { initialCreateEmployeeForm } from '@/lib/employees/build-create-payload';
import type { CreateEmployeeFormValues } from '@/lib/types/employee';
import type {
  EmployeeCustomField,
  EmployeeCustomFieldValue,
} from '@/lib/types/employee-custom-field';
import { UserRound } from 'lucide-react';

function validateRequiredCustomFields(
  fields: EmployeeCustomField[],
  drafts: Record<string, CustomFieldDraft>,
): string | null {
  for (const field of fields) {
    if (!field.required) continue;

    const draft = drafts[field.id];
    if (!draft) {
      return `"${field.title}" is required.`;
    }

    if (field.type === 'text' && !draft.valueText.trim()) {
      return `"${field.title}" is required.`;
    }

    if (field.type === 'number' && !draft.valueNumber.trim()) {
      return `"${field.title}" is required.`;
    }

    if (
      (field.type === 'file' || field.type === 'image') &&
      !draft.file &&
      !draft.url?.trim()
    ) {
      return `"${field.title}" is required.`;
    }
  }

  return null;
}

export default function MyProfilePage() {
  const { user, loading: authLoading } = useAuthRole();
  const {
    employee,
    loading: employeeLoading,
    error: employeeError,
    refresh,
  } = useCurrentEmployee(user?.email);

  const [form, setForm] = useState<CreateEmployeeFormValues>(initialCreateEmployeeForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [visaFile, setVisaFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customFields, setCustomFields] = useState<EmployeeCustomField[]>([]);
  const [customValues, setCustomValues] = useState<EmployeeCustomFieldValue[]>([]);
  const [customLoading, setCustomLoading] = useState(true);
  const customDraftsRef = useRef<Record<string, CustomFieldDraft>>({});

  useEffect(() => {
    if (!employee) {
      setForm(initialCreateEmployeeForm);
      return;
    }
    setForm(employeeToFormValues(employee));
    setPhotoFile(null);
    setPassportFile(null);
    setVisaFile(null);
  }, [employee]);

  const loadCustomFields = useCallback(async () => {
    if (!employee) {
      setCustomFields([]);
      setCustomValues([]);
      setCustomLoading(false);
      return;
    }

    setCustomLoading(true);
    try {
      const [fields, values] = await Promise.all([
        fetchEmployeeCustomFields(),
        fetchEmployeeCustomFieldValues(employee.id),
      ]);
      setCustomFields(fields);
      setCustomValues(values);
    } catch {
      setCustomFields([]);
      setCustomValues([]);
    } finally {
      setCustomLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    void loadCustomFields();
  }, [loadCustomFields]);

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
      await handleSaveOptionalDocuments();
      return;
    }

    setError('');
    setSuccess('');

    const hasPhoto = Boolean(photoFile || employee.photoUrl?.trim());
    if (!hasPhoto) {
      setError('A profile photo is required before submitting.');
      return;
    }

    const hasPassport = Boolean(passportFile || employee.passportUrl);
    const hasVisa = Boolean(visaFile || employee.visaUrl);
    if (!hasPassport || !hasVisa) {
      setError('Passport and visa documents are required before submitting.');
      return;
    }

    const personalDetailsError = validatePersonalDetails(form);
    if (personalDetailsError) {
      setError(personalDetailsError);
      return;
    }

    const requiredCustomError = validateRequiredCustomFields(
      customFields,
      customDraftsRef.current,
    );
    if (requiredCustomError) {
      setError(requiredCustomError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (customFields.length > 0) {
        const values = await buildCustomFieldValuePayloads({
          fields: customFields,
          drafts: customDraftsRef.current,
          employeeCode: employee.employeeId,
        });
        if (values.length > 0) {
          await saveEmployeeCustomFieldValuesRequest({ values });
        }
      }

      let photoUrl = employee.photoUrl?.trim() ?? '';
      let passportUrl = employee.passportUrl ?? '';
      let passportFileName = employee.passportFileName;
      let visaUrl = employee.visaUrl ?? '';
      let visaFileName = employee.visaFileName;

      if (photoFile) {
        photoUrl = await uploadEmployeeAvatar(employee.employeeId, photoFile);
      }

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
        photoUrl,
        passportUrl,
        visaUrl,
        passportFileName,
        visaFileName,
      });

      setPhotoFile(null);
      setPassportFile(null);
      setVisaFile(null);
      setSuccess('Profile submitted for admin review.');
      await Promise.all([refresh(), loadCustomFields()]);
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

  async function handleSaveOptionalDocuments() {
    if (!employee) return;

    setError('');
    setSuccess('');

    const drafts = customDraftsRef.current;
    const optionalFields = customFields.filter((field) =>
      isOptionalMissingDocumentField(field, drafts[field.id]),
    );
    const fieldsWithNewFiles = optionalFields.filter(
      (field) => drafts[field.id]?.file,
    );

    if (fieldsWithNewFiles.length === 0) {
      setError('Select an optional document to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const values = await buildCustomFieldValuePayloads({
        fields: fieldsWithNewFiles,
        drafts,
        employeeCode: employee.employeeId,
      });
      if (values.length === 0) {
        setError('Select an optional document to upload.');
        return;
      }
      await saveEmployeeCustomFieldValuesRequest({ values });
      setSuccess('Optional documents saved.');
      await loadCustomFields();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save optional documents.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const loading = authLoading || employeeLoading;
  const profileStatus = normalizePersonalProfileStatus(employee?.personalProfileStatus);
  const isReadOnly = profileStatus === 'Approved';
  const busy = isSubmitting || loading || customLoading;
  const personalBusy = busy || isReadOnly;
  const hasOptionalMissingDocs = customFields.some((field) => {
    const existing = customValues.find((value) => value.fieldId === field.id);
    return isOptionalMissingDocumentField(field, {
      url: existing?.url,
      fileName: existing?.fileName,
    });
  });

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
                Your profile is approved. Personal details stay locked; you can still
                upload optional documents that were not required.
              </p>
            ) : (
              <p className="text-xs text-subtle">
                Upload your profile photo, complete your personal details, passport/visa,
                and any required additional fields, then submit for admin approval.
              </p>
            )}
            {profileStatus === 'Rejected' &&
            employee.personalProfileRejectionReason ? (
              <p className="text-xs text-red-300/90">
                Rejection reason: {employee.personalProfileRejectionReason}
              </p>
            ) : null}
          </div>

          <FormSection
            title="Profile photo"
            description={
              isReadOnly
                ? 'Your photo on file for scheduling and attendance.'
                : 'A clear photo of your face is required for your staff profile.'
            }
            icon={UserRound}
          >
            <EmployeePhotoUpload
              currentPhotoUrl={employee.photoUrl}
              selectedFile={photoFile}
              onFileChange={setPhotoFile}
              disabled={personalBusy}
              readOnly={isReadOnly}
              required={!isReadOnly}
            />
          </FormSection>

          <EmployeePersonalFields
            form={form}
            onChange={patchForm}
            disabled={personalBusy}
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

          {!customLoading && customFields.length > 0 ? (
            <EmployeeCustomFieldsForm
              fields={customFields}
              values={customValues}
              disabled={busy}
              readOnly={isReadOnly}
              allowOptionalDocumentUpload={isReadOnly}
              idPrefix="my-custom"
              draftsRef={customDraftsRef}
            />
          ) : null}

          {error ? <FormAlert variant="error">{error}</FormAlert> : null}
          {success ? <FormAlert variant="success">{success}</FormAlert> : null}

          {!isReadOnly ? (
            <FormActions
              submitLabel={isSubmitting ? 'Submitting…' : 'Submit for review'}
              disabled={personalBusy}
              hideCancel
            />
          ) : hasOptionalMissingDocs ? (
            <FormActions
              submitLabel={isSubmitting ? 'Saving…' : 'Save optional documents'}
              disabled={busy}
              hideCancel
            />
          ) : null}
        </form>
      )}
    </PageContent>
  );
}
