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

interface EmployeeCustomFieldsFormProps {
  fields: EmployeeCustomField[];
  values: EmployeeCustomFieldValue[];
  disabled?: boolean;
  readOnly?: boolean;
  idPrefix?: string;
  draftsRef?: MutableRefObject<Record<string, CustomFieldDraft>>;
}

export function EmployeeCustomFieldsForm({
  fields,
  values,
  disabled = false,
  readOnly = false,
  idPrefix = 'custom',
  draftsRef,
}: EmployeeCustomFieldsFormProps) {
  const [drafts, setDrafts] = useState<Record<string, CustomFieldDraft>>(() =>
    buildInitialDrafts(fields, values),
  );
  const internalRef = useRef(drafts);
  const targetRef = draftsRef ?? internalRef;
  const fieldsLocked = disabled || readOnly;

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
      description="Extra details requested by your organisation."
      icon={ClipboardList}
    >
      <div className="space-y-5">
        {fields.map((field) => {
          const draft = drafts[field.id] ?? {
            valueText: '',
            valueNumber: '',
            file: null,
          };

          return (
            <div key={field.id} className="space-y-2">
              {field.type === 'text' ? (
                <FormField
                  label={field.title}
                  htmlFor={`${idPrefix}-${field.id}`}
                  required={field.required}
                  hint={field.description}
                >
                  <input
                    id={`${idPrefix}-${field.id}`}
                    type="text"
                    value={draft.valueText}
                    onChange={(event) =>
                      patchDraft(field.id, { valueText: event.target.value })
                    }
                    disabled={fieldsLocked}
                    readOnly={readOnly}
                    className={formInputClass}
                  />
                </FormField>
              ) : null}

              {field.type === 'number' ? (
                <FormField
                  label={field.title}
                  htmlFor={`${idPrefix}-${field.id}`}
                  required={field.required}
                  hint={field.description}
                >
                  <input
                    id={`${idPrefix}-${field.id}`}
                    type="number"
                    value={draft.valueNumber}
                    onChange={(event) =>
                      patchDraft(field.id, { valueNumber: event.target.value })
                    }
                    disabled={fieldsLocked}
                    readOnly={readOnly}
                    className={formInputClass}
                  />
                </FormField>
              ) : null}

              {field.type === 'file' || field.type === 'image' ? (
                <EmployeeDocumentUpload
                  label={field.required ? `${field.title} *` : field.title}
                  description={field.description}
                  currentFileName={draft.fileName}
                  currentFileUrl={draft.url}
                  selectedFile={draft.file}
                  onFileChange={(file) => patchDraft(field.id, { file })}
                  disabled={fieldsLocked}
                  readOnly={readOnly}
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
