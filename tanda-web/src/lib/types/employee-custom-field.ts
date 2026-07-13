export const EMPLOYEE_CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'file',
  'image',
] as const;

export type EmployeeCustomFieldType = (typeof EMPLOYEE_CUSTOM_FIELD_TYPES)[number];

export interface EmployeeCustomFieldFirestore {
  title: string;
  description?: string;
  type: EmployeeCustomFieldType;
  required: boolean;
  active: boolean;
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmployeeCustomField extends EmployeeCustomFieldFirestore {
  id: string;
}

export interface CreateEmployeeCustomFieldInput {
  title: string;
  description?: string;
  type: EmployeeCustomFieldType;
  required?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface UpdateEmployeeCustomFieldInput {
  title?: string;
  description?: string | null;
  type?: EmployeeCustomFieldType;
  required?: boolean;
  active?: boolean;
  sortOrder?: number;
}

export interface EmployeeCustomFieldValueFirestore {
  employeeDocId: string;
  fieldId: string;
  type: EmployeeCustomFieldType;
  valueText?: string;
  valueNumber?: number;
  url?: string;
  fileName?: string;
  storagePath?: string;
  mimeType?: string;
  updatedAt?: unknown;
  updatedByUid?: string;
  updatedByEmail?: string;
}

export interface EmployeeCustomFieldValue extends EmployeeCustomFieldValueFirestore {
  id: string;
}

export interface UpsertEmployeeCustomFieldValueInput {
  fieldId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  url?: string | null;
  fileName?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
}
