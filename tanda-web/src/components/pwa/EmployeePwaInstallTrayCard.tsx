'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'cc-pwa-install-dismissed-at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const chrome = /CriOS|Chrome|EdgiOS|FxiOS/.test(ua);
  return iOS && webkit && !chrome;
}

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Non-blocking PWA install offer for the employee notifications tray.
 * Captures `beforeinstallprompt` globally so the Install button can open the native sheet.
 */
export function useEmployeePwaInstallOffer() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || wasRecentlyDismissed()) {
      setDismissed(true);
      return;
    }

    setDismissed(false);
    if (isIosSafari()) setIosHint(true);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  const visible =
    !dismissed && !isStandaloneDisplay() && (Boolean(deferred) || iosHint);

  const dismiss = useCallback(() => {
    markDismissed();
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      markDismissed();
      setDismissed(true);
    } catch {
      // Native sheet dismissed — leave offer available.
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  return {
    visible,
    iosHint,
    canPromptInstall: Boolean(deferred),
    installing,
    install,
    dismiss,
  };
}

/** Optional card inside the employee notifications panel (not a modal). */
export function EmployeePwaInstallTrayCard() {
  const {
    visible,
    iosHint,
    canPromptInstall,
    installing,
    install,
    dismiss,
  } = useEmployeePwaInstallOffer();

  if (!visible) return null;

  return (
    <div className="border-b border-border bg-surface-base/60 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Install Continental Cargo
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">
            Optional — add the app to your home screen for quicker access.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-subtle transition hover:bg-surface-hover/60 hover:text-foreground"
          aria-label="Dismiss install suggestion"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {iosHint ? (
        <div className="mt-2 space-y-1.5 text-[11px] text-muted">
          <p className="flex items-start gap-1.5">
            <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Safari → Share → Add to Home Screen
          </p>
          <p className="flex items-start gap-1.5">
            <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Then tap Add
          </p>
        </div>
      ) : null}

      {canPromptInstall ? (
        <button
          type="button"
          onClick={() => void install()}
          disabled={installing}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          {installing ? 'Installing…' : 'Install app'}
        </button>
      ) : null}
    </div>
  );
}
