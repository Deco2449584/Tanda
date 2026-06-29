/** Firebase Auth requires an email-shaped identifier even for kiosk-only logins. */
export function normalizeKioskLoginEmail(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('@')) return value;
  return `${value}@kiosk.local`;
}
