import { auth } from '@/lib/firebase';
import type {
  CreateEmployeeCustomFieldInput,
  EmployeeCustomField,
  EmployeeCustomFieldValue,
  UpdateEmployeeCustomFieldInput,
  UpsertEmployeeCustomFieldValueInput,
} from '@/lib/types/employee-custom-field';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchEmployeeCustomFields(options?: {
  activeOnly?: boolean;
  includeInactive?: boolean;
}): Promise<EmployeeCustomField[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set('activeOnly', 'true');
  if (options?.includeInactive) params.set('includeInactive', 'true');
  const query = params.toString();
  const response = await fetch(
    `/api/employee-custom-fields${query ? `?${query}` : ''}`,
    { headers },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not load custom fields.');
  }

  const data = (await response.json()) as { fields: EmployeeCustomField[] };
  return data.fields ?? [];
}

export async function createEmployeeCustomFieldRequest(
  input: CreateEmployeeCustomFieldInput,
): Promise<string> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/employee-custom-fields', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not create custom field.');
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function updateEmployeeCustomFieldRequest(
  fieldId: string,
  input: UpdateEmployeeCustomFieldInput,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/employee-custom-fields/${encodeURIComponent(fieldId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update custom field.');
  }
}

export async function deleteEmployeeCustomFieldRequest(fieldId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/employee-custom-fields/${encodeURIComponent(fieldId)}`,
    { method: 'DELETE', headers },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not delete custom field.');
  }
}

export async function fetchEmployeeCustomFieldValues(
  employeeDocId: string,
): Promise<EmployeeCustomFieldValue[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/employee-custom-fields/values?employeeDocId=${encodeURIComponent(employeeDocId)}`,
    { headers },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not load field values.');
  }

  const data = (await response.json()) as { values: EmployeeCustomFieldValue[] };
  return data.values ?? [];
}

export async function saveEmployeeCustomFieldValuesRequest(input: {
  employeeDocId?: string;
  values: UpsertEmployeeCustomFieldValueInput[];
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/employee-custom-fields/values', {
    method: 'PUT',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not save field values.');
  }
}
