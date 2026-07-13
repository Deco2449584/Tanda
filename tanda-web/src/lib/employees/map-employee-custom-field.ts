import type {
  EmployeeCustomField,
  EmployeeCustomFieldType,
  EmployeeCustomFieldValue,
  EmployeeCustomFieldValueFirestore,
} from '@/lib/types/employee-custom-field';
import { EMPLOYEE_CUSTOM_FIELD_TYPES } from '@/lib/types/employee-custom-field';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function isEmployeeCustomFieldType(
  value: unknown,
): value is EmployeeCustomFieldType {
  return (
    typeof value === 'string' &&
    (EMPLOYEE_CUSTOM_FIELD_TYPES as readonly string[]).includes(value)
  );
}

export function mapEmployeeCustomFieldDoc(
  id: string,
  data: Record<string, unknown>,
): EmployeeCustomField {
  const type = isEmployeeCustomFieldType(data.type) ? data.type : 'text';

  return {
    id,
    title: typeof data.title === 'string' ? data.title.trim() : '',
    description: optionalString(data.description),
    type,
    required: data.required === true,
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function mapEmployeeCustomFieldValueDoc(
  id: string,
  data: Record<string, unknown>,
): EmployeeCustomFieldValue {
  const type = isEmployeeCustomFieldType(data.type) ? data.type : 'text';
  const base: EmployeeCustomFieldValueFirestore = {
    employeeDocId:
      typeof data.employeeDocId === 'string' ? data.employeeDocId.trim() : '',
    fieldId: typeof data.fieldId === 'string' ? data.fieldId.trim() : '',
    type,
    valueText: optionalString(data.valueText),
    url: optionalString(data.url),
    fileName: optionalString(data.fileName),
    storagePath: optionalString(data.storagePath),
    mimeType: optionalString(data.mimeType),
    updatedAt: data.updatedAt,
    updatedByUid: optionalString(data.updatedByUid),
    updatedByEmail: optionalString(data.updatedByEmail),
  };

  if (typeof data.valueNumber === 'number' && Number.isFinite(data.valueNumber)) {
    base.valueNumber = data.valueNumber;
  }

  return { id, ...base };
}

export function customFieldValueDocId(
  employeeDocId: string,
  fieldId: string,
): string {
  return `${employeeDocId}_${fieldId}`;
}

export function employeeCustomFieldTypeLabel(type: EmployeeCustomFieldType): string {
  switch (type) {
    case 'text':
      return 'Text';
    case 'number':
      return 'Number';
    case 'file':
      return 'File';
    case 'image':
      return 'Image';
    default:
      return type;
  }
}
