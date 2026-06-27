import { auth } from '@/lib/firebase';
import type { CompanySettings } from '@/lib/types/company-settings';

export async function saveCompanySettingsViaApi(
  settings: CompanySettings,
): Promise<void> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  const response = await fetch('/api/settings/general', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not save settings.');
  }
}
