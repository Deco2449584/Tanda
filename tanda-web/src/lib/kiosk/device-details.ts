import type { KioskDeviceDetails } from '@/lib/types/kiosk-device';

interface UserAgentDataLike {
  platform?: string;
  mobile?: boolean;
  brands?: { brand: string; version: string }[];
  getHighEntropyValues?: (hints: string[]) => Promise<{
    platform?: string;
    platformVersion?: string;
    model?: string;
    mobile?: boolean;
  }>;
}

function detectBrowserFromUa(ua: string): string | undefined {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return undefined;
}

function detectOsFromUa(ua: string): string | undefined {
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return undefined;
}

/** Collects a best-effort device fingerprint from the browser. */
export async function collectKioskDeviceDetails(): Promise<KioskDeviceDetails> {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const ua = navigator.userAgent ?? '';
  const details: KioskDeviceDetails = {
    browser: detectBrowserFromUa(ua),
    os: detectOsFromUa(ua),
    platform: typeof navigator.platform === 'string' ? navigator.platform : undefined,
    language: navigator.language,
    userAgent: ua,
  };

  try {
    details.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined' && window.screen) {
    const { width, height } = window.screen;
    if (width && height) {
      details.screen = `${Math.round(width)}x${Math.round(height)}`;
    }
  }

  const uaData = (navigator as Navigator & { userAgentData?: UserAgentDataLike })
    .userAgentData;

  if (uaData) {
    if (typeof uaData.mobile === 'boolean') details.mobile = uaData.mobile;
    if (uaData.platform) details.platform = uaData.platform;

    if (typeof uaData.getHighEntropyValues === 'function') {
      try {
        const high = await uaData.getHighEntropyValues([
          'platform',
          'platformVersion',
          'model',
        ]);
        if (high.platform) {
          details.os = high.platformVersion
            ? `${high.platform} ${high.platformVersion}`
            : high.platform;
        }
        if (high.model) details.model = high.model;
        if (typeof high.mobile === 'boolean') details.mobile = high.mobile;
      } catch {
        // ignore
      }
    }
  }

  if (typeof details.mobile !== 'boolean') {
    details.mobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
  }

  // Drop undefined keys so Firestore does not reject the payload.
  (Object.keys(details) as (keyof KioskDeviceDetails)[]).forEach((key) => {
    if (details[key] === undefined) {
      delete details[key];
    }
  });

  return details;
}

/** Suggests a friendly default device name from the collected details. */
export function suggestKioskDeviceName(details: KioskDeviceDetails): string {
  if (details.model) return details.model;
  const parts = [details.os, details.browser].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Kiosk device';
}
