export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isKioskStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    iosStandalone ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function isKioskBrowserDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !isKioskStandaloneDisplay();
}

export async function enterKioskFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  const element = document.documentElement;

  try {
    if (document.fullscreenElement) {
      return true;
    }

    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return Boolean(document.fullscreenElement);
    }

    const webkitElement = element as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    if (webkitElement.webkitRequestFullscreen) {
      await webkitElement.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type KioskInstallPromptEvent = BeforeInstallPromptEvent;

export function isKioskInstallPromptEvent(
  event: Event,
): event is KioskInstallPromptEvent {
  return 'prompt' in event && typeof (event as KioskInstallPromptEvent).prompt === 'function';
}
