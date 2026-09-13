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

export type ScanPunchVia = 'qr' | 'nfc';

export function parseScanPunchVia(value: string | null | undefined): ScanPunchVia {
  return value?.trim().toLowerCase() === 'nfc' ? 'nfc' : 'qr';
}

export function scanPunchSourceForVia(via: ScanPunchVia): 'web-scan-qr' | 'web-scan-nfc' {
  return via === 'nfc' ? 'web-scan-nfc' : 'web-scan-qr';
}

export function buildScanPunchPath(token: string, via: ScanPunchVia = 'qr'): string {
  const base = `/punch/s/${encodeURIComponent(token.trim())}`;
  return via === 'nfc' ? `${base}?via=nfc` : `${base}?via=qr`;
}

export function buildScanPunchUrl(
  token: string,
  origin?: string,
  via: ScanPunchVia = 'qr',
): string {
  const path = buildScanPunchPath(token, via);
  if (origin) {
    return `${origin.replace(/\/$/, '')}${path}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
