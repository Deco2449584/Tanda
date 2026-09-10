/** Opaque URL token for QR/NFC session punches (not the Firestore location id). */
export function generateScanPunchToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function buildScanPunchPath(token: string): string {
  return `/punch/s/${encodeURIComponent(token.trim())}`;
}

export function buildScanPunchUrl(token: string, origin?: string): string {
  const path = buildScanPunchPath(token);
  if (origin) {
    return `${origin.replace(/\/$/, '')}${path}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
