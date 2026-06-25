export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export async function enterKioskFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') {
    return false;
  }

  const element = document.documentElement;

  try {
    if (isFullscreenActive()) {
      return true;
    }

    if (element.requestFullscreen) {
      await element.requestFullscreen();
      return isFullscreenActive();
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

export async function exitKioskFullscreen(): Promise<void> {
  if (typeof document === 'undefined' || !isFullscreenActive()) {
    return;
  }

  try {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // ignore
  }
}
