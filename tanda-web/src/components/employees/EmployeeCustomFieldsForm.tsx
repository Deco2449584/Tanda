'use client';

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ClipboardList } from 'lucide-react';
import { EmployeeDocumentUpload } from '@/components/employees/EmployeeDocumentUpload';
import {
  FormField,
  FormSection,
  formInputClass,
} from '@/components/employees/employee-form-ui';
import { uploadEmployeeCustomFieldFile } from '@/lib/employees/upload-document';
import type {
  EmployeeCustomField,
  EmployeeCustomFieldValue,
  UpsertEmployeeCustomFieldValueInput,
} from '@/lib/types/employee-custom-field';

export type CustomFieldDraft = {
  valueText: string;
  valueNumber: string;
  file: File | null;
  url?: string;
  fileName?: string;
  storagePath?: string;
  mimeType?: string;
};

function buildInitialDrafts(
  fields: EmployeeCustomField[],
  values: EmployeeCustomFieldValue[],
): Record<string, CustomFieldDraft> {
  const byField = new Map(values.map((value) => [value.fieldId, value]));
  const drafts: Record<string, CustomFieldDraft> = {};

  for (const field of fields) {
    const value = byField.get(field.id);
    drafts[field.id] = {
      valueText: value?.valueText ?? '',
      valueNumber:
        typeof value?.valueNumber === 'number' ? String(value.valueNumber) : '',
      file: null,
      url: value?.url,
      fileName: value?.fileName,
      storagePath: value?.storagePath,
      mimeType: value?.mimeType,
    };
  }

  return drafts;
}

/** Optional file/image fields with nothing on file yet. */
export function isOptionalMissingDocumentField(
  field: EmployeeCustomField,
  draft?: Pick<CustomFieldDraft, 'url' | 'fileName'>,
): boolean {
  if (field.required) return false;
  if (field.type !== 'file' && field.type !== 'image') return false;
  return !draft?.url?.trim() && !draft?.fileName?.trim();
}

interface EmployeeCustomFieldsFormProps {
  fields: EmployeeCustomField[];
  values: EmployeeCustomFieldValue[];
  disabled?: boolean;
  readOnly?: boolean;
  /**
   * When the profile is approved, still allow uploading optional file/image
   * fields that were never filled.
   */
  allowOptionalDocumentUpload?: boolean;
  /** Hide required markers and treat every field as optional (employee self-serve). */
  forceOptional?: boolean;
  idPrefix?: string;
  draftsRef?: MutableRefObject<Record<string, CustomFieldDraft>>;
}

export function EmployeeCustomFieldsForm({
  fields,
  values,
  disabled = false,
  readOnly = false,
  allowOptionalDocumentUpload = false,
  forceOptional = false,
  idPrefix = 'custom',
  draftsRef,
}: EmployeeCustomFieldsFormProps) {
  const [drafts, setDrafts] = useState<Record<string, CustomFieldDraft>>(() =>
    buildInitialDrafts(fields, values),
  );
  const internalRef = useRef(drafts);
  const targetRef = draftsRef ?? internalRef;

  const fieldKey = useMemo(
    () =>
      `${fields.map((field) => field.id).join(',')}|${values
        .map(
          (value) =>
            `${value.fieldId}:${value.url ?? ''}:${value.valueText ?? ''}:${value.valueNumber ?? ''}`,
        )
        .join('|')}`,
    [fields, values],
  );

  useEffect(() => {
    const next = buildInitialDrafts(fields, values);
    setDrafts(next);
    targetRef.current = next;
  }, [fieldKey, fields, values, targetRef]);

  function patchDraft(fieldId: string, patch: Partial<CustomFieldDraft>) {
    setDrafts((current) => {
      const next = {
        ...current,
        [fieldId]: {
          ...(current[fieldId] ?? {
            valueText: '',
            valueNumber: '',
            file: null,
          }),
          ...patch,
        },
      };
      targetRef.current = next;
      return next;
    });
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <FormSection
      title="Additional information"
      description={
        allowOptionalDocumentUpload
          ? 'Your profile is approved. You can still upload optional documents that were not filled.'
          : forceOptional
            ? 'Extra details requested by your organisation. All fields are optional.'
            : 'Extra details requested by your organisation.'
      }
      icon={ClipboardList}
    >
      <div className="space-y-5">
        {fields.map((field) => {
          const draft = drafts[field.id] ?? {
            valueText: '',
            valueNumber: '',
            file: null,
          };
          const showRequired = field.required && !forceOptional;
          const optionalDocEditable =
            allowOptionalDocumentUpload &&
            isOptionalMissingDocumentField(field, draft);
          const fieldReadOnly = readOnly && !optionalDocEditable;
          const fieldDisabled = disabled || fieldReadOnly;

          return (
            <div key={field.id} className="space-y-2">
              {field.type === 'text' ? (
                <FormField
                  label={field.title}
                  htmlFor={`${idPrefix}-${field.id}`}
                  required={showRequired}
                  hint={field.description}
                >
                  <input
                    id={`${idPrefix}-${field.id}`}
                    type="text"
                    value={draft.valueText}
                    onChange={(event) =>
                      patchDraft(field.id, { valueText: event.target.value })
                    }
                    disabled={fieldDisabled}
                    readOnly={fieldReadOnly}
                    className={formInputClass}
                  />
                </FormField>
              ) : null}

              {field.type === 'number' ? (
                <FormField
                  label={field.title}
                  htmlFor={`${idPrefix}-${field.id}`}
                  required={showRequired}
                  hint={field.description}
                >
                  <input
                    id={`${idPrefix}-${field.id}`}
                    type="number"
                    value={draft.valueNumber}
                    onChange={(event) =>
                      patchDraft(field.id, { valueNumber: event.target.value })
                    }
                    disabled={fieldDisabled}
                    readOnly={fieldReadOnly}
                    className={formInputClass}
                  />
                </FormField>
              ) : null}

              {field.type === 'file' || field.type === 'image' ? (
                <EmployeeDocumentUpload
                  label={showRequired ? `${field.title} *` : field.title}
                  description={field.description}
                  currentFileName={draft.fileName}
                  currentFileUrl={draft.url}
                  selectedFile={draft.file}
                  onFileChange={(file) => patchDraft(field.id, { file })}
                  disabled={fieldDisabled}
                  readOnly={fieldReadOnly}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}

export async function buildCustomFieldValuePayloads(input: {
  fields: EmployeeCustomField[];
  drafts: Record<string, CustomFieldDraft>;
  employeeCode: string;
}): Promise<UpsertEmployeeCustomFieldValueInput[]> {
  const payloads: UpsertEmployeeCustomFieldValueInput[] = [];

  for (const field of input.fields) {
    const draft = input.drafts[field.id];
    if (!draft) continue;

    if (field.type === 'text') {
      payloads.push({
        fieldId: field.id,
        valueText: draft.valueText.trim() || null,
      });
      continue;
    }

    if (field.type === 'number') {
      const trimmed = draft.valueNumber.trim();
      if (!trimmed) {
        payloads.push({ fieldId: field.id, valueNumber: null });
        continue;
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new Error(`"${field.title}" must be a valid number.`);
      }
      payloads.push({ fieldId: field.id, valueNumber: parsed });
      continue;
    }

    if (draft.file) {
      const uploaded = await uploadEmployeeCustomFieldFile(
        input.employeeCode,
        field.id,
        draft.file,
        field.type,
      );
      payloads.push({
        fieldId: field.id,
        url: uploaded.url,
        fileName: uploaded.fileName,
        storagePath: uploaded.storagePath,
        mimeType: uploaded.mimeType,
      });
      continue;
    }

    payloads.push({
      fieldId: field.id,
      url: draft.url ?? null,
      fileName: draft.fileName ?? null,
      storagePath: draft.storagePath ?? null,
      mimeType: draft.mimeType ?? null,
    });
  }

  return payloads;
}
