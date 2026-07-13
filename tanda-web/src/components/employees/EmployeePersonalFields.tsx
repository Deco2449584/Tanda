'use client';

import { FileText, UserRound } from 'lucide-react';
import { EmployeeDocumentUpload } from '@/components/employees/EmployeeDocumentUpload';
import {
  FormField,
  FormGrid,
  FormSection,
  formInputClass,
} from '@/components/employees/employee-form-ui';
import type { EmployeePersonalDetails } from '@/lib/types/employee';

export type EmployeePersonalFormValues = Pick<
  EmployeePersonalDetails,
  | 'phone'
  | 'dateOfBirth'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postcode'
  | 'country'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'passportNumber'
  | 'visaExpiry'
>;

interface EmployeePersonalFieldsProps {
  form: EmployeePersonalFormValues;
  onChange: (patch: Partial<EmployeePersonalFormValues>) => void;
  disabled?: boolean;
  idPrefix?: string;
  passportFile: File | null;
  visaFile: File | null;
  onPassportFileChange: (file: File | null) => void;
  onVisaFileChange: (file: File | null) => void;
  currentPassportFileName?: string;
  currentVisaFileName?: string;
  currentPassportUrl?: string;
  currentVisaUrl?: string;
  requireDocuments?: boolean;
  /** Hide file pickers; fields stay visible for consultation. */
  readOnly?: boolean;
}

export function EmployeePersonalFields({
  form,
  onChange,
  disabled = false,
  idPrefix = 'emp',
  passportFile,
  visaFile,
  onPassportFileChange,
  onVisaFileChange,
  currentPassportFileName,
  currentVisaFileName,
  currentPassportUrl,
  currentVisaUrl,
  requireDocuments = false,
  readOnly = false,
}: EmployeePersonalFieldsProps) {
  const fieldsDisabled = disabled || readOnly;
  return (
    <>
      <FormSection
        title="Personal details"
        description="Contact information and home address for the employee file."
        icon={UserRound}
      >
        <FormGrid>
          <FormField label="Phone" htmlFor={`${idPrefix}-phone`}>
            <input
              id={`${idPrefix}-phone`}
              type="tel"
              value={form.phone ?? ''}
              onChange={(event) => onChange({ phone: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
              placeholder="+61 400 000 000"
            />
          </FormField>

          <FormField label="Date of birth" htmlFor={`${idPrefix}-dob`}>
            <input
              id={`${idPrefix}-dob`}
              type="date"
              value={form.dateOfBirth ?? ''}
              onChange={(event) => onChange({ dateOfBirth: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField
            label="Address line 1"
            htmlFor={`${idPrefix}-address-1`}
            className="md:col-span-2"
          >
            <input
              id={`${idPrefix}-address-1`}
              type="text"
              value={form.addressLine1 ?? ''}
              onChange={(event) => onChange({ addressLine1: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
              placeholder="Street and number"
            />
          </FormField>

          <FormField
            label="Address line 2"
            htmlFor={`${idPrefix}-address-2`}
            className="md:col-span-2"
          >
            <input
              id={`${idPrefix}-address-2`}
              type="text"
              value={form.addressLine2 ?? ''}
              onChange={(event) => onChange({ addressLine2: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
              placeholder="Unit, building, etc."
            />
          </FormField>

          <FormField label="City" htmlFor={`${idPrefix}-city`}>
            <input
              id={`${idPrefix}-city`}
              type="text"
              value={form.city ?? ''}
              onChange={(event) => onChange({ city: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField label="State / region" htmlFor={`${idPrefix}-state`}>
            <input
              id={`${idPrefix}-state`}
              type="text"
              value={form.state ?? ''}
              onChange={(event) => onChange({ state: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField label="Postcode" htmlFor={`${idPrefix}-postcode`}>
            <input
              id={`${idPrefix}-postcode`}
              type="text"
              value={form.postcode ?? ''}
              onChange={(event) => onChange({ postcode: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField label="Country" htmlFor={`${idPrefix}-country`}>
            <input
              id={`${idPrefix}-country`}
              type="text"
              value={form.country ?? ''}
              onChange={(event) => onChange({ country: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField label="Emergency contact" htmlFor={`${idPrefix}-emergency-name`}>
            <input
              id={`${idPrefix}-emergency-name`}
              type="text"
              value={form.emergencyContactName ?? ''}
              onChange={(event) =>
                onChange({ emergencyContactName: event.target.value })
              }
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
              placeholder="Contact name"
            />
          </FormField>

          <FormField label="Emergency phone" htmlFor={`${idPrefix}-emergency-phone`}>
            <input
              id={`${idPrefix}-emergency-phone`}
              type="tel"
              value={form.emergencyContactPhone ?? ''}
              onChange={(event) =>
                onChange({ emergencyContactPhone: event.target.value })
              }
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Identity documents"
        description={
          readOnly
            ? 'Your uploaded identity documents.'
            : requireDocuments
              ? 'Passport and visa files are required to submit for review. Images or PDF up to 10 MB.'
              : 'Attach passport and visa files. Images or PDF up to 10 MB.'
        }
        icon={FileText}
      >
        <FormGrid>
          <FormField label="Passport number" htmlFor={`${idPrefix}-passport-number`}>
            <input
              id={`${idPrefix}-passport-number`}
              type="text"
              value={form.passportNumber ?? ''}
              onChange={(event) => onChange({ passportNumber: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>

          <FormField label="Visa expiry" htmlFor={`${idPrefix}-visa-expiry`}>
            <input
              id={`${idPrefix}-visa-expiry`}
              type="date"
              value={form.visaExpiry ?? ''}
              onChange={(event) => onChange({ visaExpiry: event.target.value })}
              disabled={fieldsDisabled}
              readOnly={readOnly}
              className={formInputClass}
            />
          </FormField>
        </FormGrid>

        <FormGrid>
          <EmployeeDocumentUpload
            label={requireDocuments ? 'Passport *' : 'Passport'}
            description="Scan or photo of the passport identity page."
            currentFileName={currentPassportFileName}
            currentFileUrl={currentPassportUrl}
            selectedFile={passportFile}
            onFileChange={onPassportFileChange}
            disabled={fieldsDisabled}
            readOnly={readOnly}
          />
          <EmployeeDocumentUpload
            label={requireDocuments ? 'Visa *' : 'Visa'}
            description="Work visa or residency document."
            currentFileName={currentVisaFileName}
            currentFileUrl={currentVisaUrl}
            selectedFile={visaFile}
            onFileChange={onVisaFileChange}
            disabled={fieldsDisabled}
            readOnly={readOnly}
          />
        </FormGrid>
      </FormSection>
    </>
  );
}
