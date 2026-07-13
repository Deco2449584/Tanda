import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  customFieldValueDocId,
  isEmployeeCustomFieldType,
  mapEmployeeCustomFieldDoc,
  mapEmployeeCustomFieldValueDoc,
} from '@/lib/employees/map-employee-custom-field';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  CreateEmployeeCustomFieldInput,
  EmployeeCustomField,
  EmployeeCustomFieldValue,
  UpdateEmployeeCustomFieldInput,
  UpsertEmployeeCustomFieldValueInput,
} from '@/lib/types/employee-custom-field';

function optionalTrim(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function listEmployeeCustomFields(options?: {
  activeOnly?: boolean;
}): Promise<EmployeeCustomField[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS)
    .get();

  let fields = snapshot.docs.map((document) =>
    mapEmployeeCustomFieldDoc(document.id, document.data() as Record<string, unknown>),
  );

  if (options?.activeOnly) {
    fields = fields.filter((field) => field.active);
  }

  return fields.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

export async function createEmployeeCustomField(
  input: CreateEmployeeCustomFieldInput,
): Promise<string> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Title is required.');
  }
  if (!isEmployeeCustomFieldType(input.type)) {
    throw new Error('Invalid field type.');
  }

  const ref = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS)
    .add({
      title,
      description: optionalTrim(input.description) ?? null,
      type: input.type,
      required: input.required === true,
      active: input.active !== false,
      sortOrder:
        typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
          ? input.sortOrder
          : Date.now(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return ref.id;
}

export async function updateEmployeeCustomField(
  fieldId: string,
  input: UpdateEmployeeCustomFieldInput,
): Promise<void> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS)
    .doc(fieldId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error('Field not found.');
  }

  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('Title is required.');
    payload.title = title;
  }

  if (input.description !== undefined) {
    payload.description = optionalTrim(input.description) ?? null;
  }

  if (input.type !== undefined) {
    if (!isEmployeeCustomFieldType(input.type)) {
      throw new Error('Invalid field type.');
    }
    payload.type = input.type;
  }

  if (input.required !== undefined) payload.required = input.required === true;
  if (input.active !== undefined) payload.active = input.active === true;
  if (input.sortOrder !== undefined) {
    if (typeof input.sortOrder !== 'number' || !Number.isFinite(input.sortOrder)) {
      throw new Error('Invalid sort order.');
    }
    payload.sortOrder = input.sortOrder;
  }

  await ref.update(payload);
}

export async function deleteEmployeeCustomField(fieldId: string): Promise<void> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELDS)
    .doc(fieldId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error('Field not found.');
  }

  await ref.delete();
}

export async function listEmployeeCustomFieldValues(
  employeeDocId: string,
): Promise<EmployeeCustomFieldValue[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES)
    .where('employeeDocId', '==', employeeDocId)
    .get();

  return snapshot.docs.map((document) =>
    mapEmployeeCustomFieldValueDoc(
      document.id,
      document.data() as Record<string, unknown>,
    ),
  );
}

export async function upsertEmployeeCustomFieldValues(input: {
  employeeDocId: string;
  values: UpsertEmployeeCustomFieldValueInput[];
  updatedByUid: string;
  updatedByEmail: string;
}): Promise<void> {
  const fields = await listEmployeeCustomFields();
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const db = getAdminFirestore();
  const batch = db.batch();

  for (const item of input.values) {
    const field = fieldById.get(item.fieldId);
    if (!field || !field.active) {
      throw new Error(`Unknown or inactive field: ${item.fieldId}`);
    }

    const docId = customFieldValueDocId(input.employeeDocId, field.id);
    const ref = db.collection(COLLECTIONS.EMPLOYEE_CUSTOM_FIELD_VALUES).doc(docId);
    const payload: Record<string, unknown> = {
      employeeDocId: input.employeeDocId,
      fieldId: field.id,
      type: field.type,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: input.updatedByUid,
      updatedByEmail: input.updatedByEmail,
    };

    if (field.type === 'text') {
      const text = optionalTrim(item.valueText);
      if (field.required && !text) {
        throw new Error(`"${field.title}" is required.`);
      }
      payload.valueText = text ?? null;
      payload.valueNumber = FieldValue.delete();
      payload.url = FieldValue.delete();
      payload.fileName = FieldValue.delete();
      payload.storagePath = FieldValue.delete();
      payload.mimeType = FieldValue.delete();
    } else if (field.type === 'number') {
      const raw = item.valueNumber;
      const hasNumber = typeof raw === 'number' && Number.isFinite(raw);
      if (field.required && !hasNumber) {
        throw new Error(`"${field.title}" is required.`);
      }
      payload.valueNumber = hasNumber ? raw : null;
      payload.valueText = FieldValue.delete();
      payload.url = FieldValue.delete();
      payload.fileName = FieldValue.delete();
      payload.storagePath = FieldValue.delete();
      payload.mimeType = FieldValue.delete();
    } else {
      const url = optionalTrim(item.url);
      if (field.required && !url) {
        throw new Error(`"${field.title}" is required.`);
      }
      payload.url = url ?? null;
      payload.fileName = optionalTrim(item.fileName) ?? null;
      payload.storagePath = optionalTrim(item.storagePath) ?? null;
      payload.mimeType = optionalTrim(item.mimeType) ?? null;
      payload.valueText = FieldValue.delete();
      payload.valueNumber = FieldValue.delete();
    }

    batch.set(ref, payload, { merge: true });
  }

  await batch.commit();
}
