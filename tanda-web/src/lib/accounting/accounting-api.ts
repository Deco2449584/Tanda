import { auth } from '@/lib/firebase';
import type { PayRules, SiteBilling, StaffPayRates } from '@/lib/types/pay-rules';

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

async function parseError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function savePayRulesRequest(rules: PayRules): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/accounting/rules', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ rules }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not save pay rules.'));
  }
}

export async function saveStaffRatesRequest(input: {
  employeeDocId: string;
  employmentTypeId?: string;
  payRates?: StaffPayRates;
  hourlyRate?: number;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/accounting/staff/${input.employeeDocId}/rates`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      employmentTypeId: input.employmentTypeId,
      payRates: input.payRates,
      hourlyRate: input.hourlyRate,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not save staff rates.'));
  }
}

export async function saveSiteBillingRequest(input: {
  locationId: string;
  billing: SiteBilling;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/accounting/sites/${input.locationId}/billing`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ billing: input.billing }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not save site billing.'));
  }
}
