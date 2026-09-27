export function normalizePortalUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validatePortalUsername(value: string): string | null {
  const username = normalizePortalUsername(value);
  if (!username) return 'Username is required.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 64) return 'Username is too long.';
  if (!/^[a-z0-9._@-]+$/.test(username)) {
    return 'Username can only include letters, numbers, and . _ @ -';
  }
  return null;
}

export function validatePortalPassword(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 128) return 'Password is too long.';
  return null;
}
