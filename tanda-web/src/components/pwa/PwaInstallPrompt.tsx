'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { CompanyLogo } from '@/components/ui/CompanyLogo';

const DISMISS_KEY = 'cc-pwa-install-dismissed-at';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 1600;

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
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
    // ignore quota / private mode
  }
}

/**
 * Soft prompt to install the PWA. Browsers never allow silent auto-install;
 * this captures `beforeinstallprompt` and shows a one-tap Install button.
 */
export function PwaInstallPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || wasRecentlyDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (isStandaloneDisplay() || wasRecentlyDismissed()) return;
      if (isIosSafari()) {
        setIosHint(true);
        setOpen(true);
      }
      // Chromium: wait for beforeinstallprompt (handled below / in listener).
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  // When the deferred prompt arrives after the dialog already opened, keep it.
  useEffect(() => {
    if (!deferred || isStandaloneDisplay() || wasRecentlyDismissed()) return;
    setOpen(true);
  }, [deferred]);

  const close = useCallback(() => {
    markDismissed();
    setOpen(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      markDismissed();
      setOpen(false);
    } catch {
      // User dismissed native sheet — keep our dialog dismissible.
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={close}
      size="sm"
      title="Install Continental Cargo"
      description="Add the app to your home screen for faster access, offline shell, and a full-screen experience."
    >
      <div className="mb-5 flex justify-center">
        <CompanyLogo className="h-10 w-auto" />
      </div>

      {iosHint ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-base/50 p-4 text-sm text-muted">
          <p className="flex items-start gap-2 text-foreground">
            <Share className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Tap the <strong className="mx-1">Share</strong> button in Safari.
          </p>
          <p className="flex items-start gap-2 text-foreground">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Choose <strong className="mx-1">Add to Home Screen</strong>, then Add.
          </p>
        </div>
      ) : deferred ? (
        <p className="text-sm text-muted">
          Install once and open Continental Cargo like a native app — no App Store needed.
        </p>
      ) : (
        <p className="text-sm text-muted">
          If your browser supports install, use the menu (⋮) → <strong>Install app</strong> /
          <strong> Add to Home screen</strong>.
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={close}>
          Not now
        </Button>
        {deferred ? (
          <Button onClick={() => void handleInstall()} disabled={installing}>
            <Download className="h-4 w-4" />
            {installing ? 'Installing…' : 'Install app'}
          </Button>
        ) : iosHint ? (
          <Button onClick={close}>Got it</Button>
        ) : null}
      </div>
    </Dialog>
  );
}
