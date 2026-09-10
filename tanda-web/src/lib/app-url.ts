function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Public site origin for emails and Firebase Auth continue URLs.
 * Set APP_BASE_URL per environment (Vercel, .env.local) — never hardcode in code.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.APP_BASE_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return normalizeBaseUrl(`https://${vercel}`);

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'APP_BASE_URL is not set. Add it to your environment (e.g. https://continentalcargo.online in production).',
  );
}

export function getAppLoginUrl(): string {
  return `${getAppBaseUrl()}/login`;
}

export function getAppAuthActionUrl(): string {
  return `${getAppBaseUrl()}/auth/action`;
}

/** Absolute URL for email images (PNG on the app origin — better client support than SVG). */
export function getAppLogoUrl(
  variant: 'light' | 'horizontal' | 'mark-light' = 'horizontal',
): string {
  const file =
    variant === 'mark-light'
      ? 'logos/logo-mark-light.png'
      : 'logos/logo-horizontal.png';
  return `${getAppBaseUrl()}/${file}`;
}
