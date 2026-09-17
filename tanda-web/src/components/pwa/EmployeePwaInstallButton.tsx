'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { registerWorkforceServiceWorker } from '@/lib/pwa/register-workforce-sw';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return true;
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standalone || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const other = /CriOS|Chrome|EdgiOS|FxiOS/.test(ua);
  return iOS && webkit && !other;
}

/**
 * Header button (employees only) to install the PWA as a real app (WebAPK).
 * Hidden when already installed. Registers the service worker first so Chrome
 * can offer Install app instead of only “Create shortcut”.
 */
export function EmployeePwaInstallButton() {
  const [installed, setInstalled] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (isPwaInstalled()) {
      setInstalled(true);
      return;
    }

    setInstalled(false);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayMode = () => setInstalled(isPwaInstalled());
    media.addEventListener?.('change', onDisplayMode);

    void (async () => {
      await registerWorkforceServiceWorker();
      setSwReady(true);
    })();

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferred(null);
      } catch {
        // User closed the native install sheet
      } finally {
        setBusy(false);
      }
      return;
    }

    // Ensure SW is registered, then wait briefly for Chrome to fire the install event.
    setBusy(true);
    try {
      await registerWorkforceServiceWorker();
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    } finally {
      setBusy(false);
    }

    if (isIosSafari()) {
      window.alert(
        'To install as an app: tap Share in Safari → Add to Home Screen.',
      );
      return;
    }

    window.alert(
      [
        'Install is not ready yet on this browser.',
        '',
        '1. Use Chrome (not in-app browsers).',
        '2. Remove any old “shortcut” to this site from your home screen.',
        '3. Reload this page, wait a few seconds, tap Install again.',
        '',
        'When Chrome offers two options, choose “Install app” — not “Create shortcut”.',
      ].join('\n'),
    );
  }, [deferred]);

  if (installed) return null;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground disabled:opacity-60"
      aria-label="Install app"
      title={
        deferred
          ? 'Install app'
          : swReady
            ? 'Install app'
            : 'Preparing install…'
      }
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
