export function normalizeNotificationEmail(
  email: string | null | undefined,
): string {
  return email?.trim().toLowerCase() ?? '';
}

export function notificationPreferencesDocId(email: string): string {
  return normalizeNotificationEmail(email).replace(/[@.]/g, '_');
}
