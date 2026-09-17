'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';

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
 * Header button (employees only) to install the PWA.
 * Hidden when the app is already running as an installed PWA.
 */
export function EmployeePwaInstallButton() {
  const [installed, setInstalled] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isPwaInstalled());

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
        // User closed the sheet
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isIosSafari()) {
      window.alert(
        'To install: tap Share in Safari, then “Add to Home Screen”.',
      );
      return;
    }

    window.alert(
      'To install: open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.',
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
      title="Install app"
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
