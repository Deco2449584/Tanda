import { auth } from '@/lib/firebase';
import type { AccountingPeriodLock } from '@/lib/accounting/period-lock';
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
  payRateHistory?: StaffPayRates[];
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/accounting/staff/${input.employeeDocId}/rates`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      employmentTypeId: input.employmentTypeId,
      payRates: input.payRates,
      hourlyRate: input.hourlyRate,
      payRateHistory: input.payRateHistory,
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not save staff rates.'));
  }
}

export async function bulkSaveStaffRatesRequest(input: {
  ids: string[];
  employmentTypeId?: string;
  payRates?: StaffPayRates;
  hourlyRate?: number;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/accounting/staff/rates', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not apply rates to selected staff.'));
  }
}

export async function saveSiteBillingRequest(input: {
  locationId: string;
  billing: SiteBilling;
  billingHistory?: SiteBilling[];
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/accounting/sites/${input.locationId}/billing`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ billing: input.billing, billingHistory: input.billingHistory }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not save site billing.'));
  }
}

export async function fetchPeriodLockRequest(input: {
  start: string;
  end: string;
}): Promise<AccountingPeriodLock | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/accounting/periods/lock?start=${encodeURIComponent(input.start)}&end=${encodeURIComponent(input.end)}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load period lock.'));
  }
  const data = (await response.json()) as { lock?: AccountingPeriodLock | null };
  return data.lock ?? null;
}

export async function lockPeriodRequest(input: {
  start: string;
  end: string;
  snapshot: AccountingPeriodLock['snapshot'];
}): Promise<AccountingPeriodLock> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/accounting/periods/lock', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not close this period.'));
  }
  const data = (await response.json()) as { lock: AccountingPeriodLock };
  return data.lock;
}

export async function unlockPeriodRequest(input: {
  start: string;
  end: string;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/accounting/periods/lock', {
    method: 'DELETE',
    headers,
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not reopen this period.'));
  }
}
