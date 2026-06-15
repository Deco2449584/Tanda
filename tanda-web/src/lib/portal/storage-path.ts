export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('firebasestorage.googleapis.com')) {
      const match = parsed.pathname.match(/\/o\/(.+)$/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    if (parsed.hostname.endsWith('.firebasestorage.app')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const objectIndex = parts.indexOf('o');
      if (objectIndex >= 0 && parts[objectIndex + 1]) {
        return decodeURIComponent(parts[objectIndex + 1]);
      }
    }

    if (parsed.hostname === 'storage.googleapis.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return decodeURIComponent(parts.slice(1).join('/'));
      }
    }
  } catch {
    return null;
  }

  return null;
}
