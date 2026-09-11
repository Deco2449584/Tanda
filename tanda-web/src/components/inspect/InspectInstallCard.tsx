'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

/** Install Continental Inspect as its own home-screen app (separate from Workspace). */
export function InspectInstallCard() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setIosHint(isIosSafari() && !isStandaloneDisplay());

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  if (standalone) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5">
        <Smartphone className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Installed as app
          </p>
          <p className="text-xs text-subtle">
            Continental Inspect is running independently from Workspace.
          </p>
        </div>
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        disabled={installing}
        onClick={() => {
          void (async () => {
            setInstalling(true);
            try {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
              setStandalone(isStandaloneDisplay());
            } finally {
              setInstalling(false);
            }
          })();
        }}
        className="flex w-full items-center gap-3 rounded-xl border border-primary/40 bg-primary/15 px-4 py-3.5 text-left transition hover:bg-primary/20 disabled:opacity-60"
      >
        <Download className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {installing ? 'Installing…' : 'Install Continental Inspect'}
          </span>
          <span className="block text-xs text-subtle">
            Add to your home screen as a separate app from Workspace
          </span>
        </span>
      </button>
    );
  }

  if (iosHint) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised px-4 py-3.5">
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Install on iPhone / iPad
            </p>
            <p className="mt-1 text-xs leading-relaxed text-subtle">
              Tap Share → <span className="text-foreground">Add to Home Screen</span>.
              Open this page from Safari (not inside another app) so Inspect
              installs as its own icon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
      <Download className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Install as app
        </p>
        <p className="text-xs text-subtle">
          Use your browser menu → Install app / Add to Home Screen while on
          /inspect. It installs separately from Workspace.
        </p>
      </div>
    </div>
  );
}
