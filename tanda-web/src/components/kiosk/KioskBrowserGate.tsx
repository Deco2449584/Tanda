'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Download, Maximize2, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import {
  enterKioskFullscreen,
  isIosDevice,
  isKioskInstallPromptEvent,
  isKioskStandaloneDisplay,
  type KioskInstallPromptEvent,
} from '@/lib/pwa/kiosk-display';

type GateState = 'checking' | 'ready' | 'immersive';

export function KioskBrowserGate({ children }: { children: ReactNode }) {
  const [gateState, setGateState] = useState<GateState>('checking');
  const [installPrompt, setInstallPrompt] = useState<KioskInstallPromptEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const recheckDisplayMode = useCallback(() => {
    if (isKioskStandaloneDisplay() || document.fullscreenElement) {
      setGateState('immersive');
      return true;
    }

    setGateState('ready');
    return false;
  }, []);

  useEffect(() => {
    recheckDisplayMode();

    function handleInstallPrompt(event: Event) {
      if (!isKioskInstallPromptEvent(event)) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleDisplayModeChange() {
      recheckDisplayMode();
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleDisplayModeChange);
    window.addEventListener('fullscreenchange', handleDisplayModeChange);

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

    standaloneQuery.addEventListener('change', handleDisplayModeChange);
    fullscreenQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleDisplayModeChange);
      window.removeEventListener('fullscreenchange', handleDisplayModeChange);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
      fullscreenQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, [recheckDisplayMode]);

  async function handleInstall() {
    if (!installPrompt) {
      setMessage('Open Chrome menu → Install app / Add to Home screen.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);

      if (choice.outcome === 'accepted') {
        setMessage('App installed. Open it from the Kiosk icon on your home screen.');
      }
    } catch {
      setMessage('Could not start installation. Use the browser menu instead.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFullscreen() {
    setBusy(true);
    setMessage('');

    const entered = await enterKioskFullscreen();
    setBusy(false);

    if (entered || recheckDisplayMode()) {
      return;
    }

    setMessage('Fullscreen was blocked. Install the Kiosk app for a clean tablet experience.');
  }

  if (gateState === 'checking' || gateState === 'immersive') {
    return <>{children}</>;
  }

  const ios = isIosDevice();

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[200] bg-zinc-950">{children}</div>

      <div className="fixed inset-0 z-[210] flex items-center justify-center bg-zinc-950/95 px-6 py-10 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <CompanyLogo variant="mark-light" className="h-14 w-14" priority />
            <div className="mt-4 flex items-center gap-2 text-secondary">
              <MonitorSmartphone className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Kiosk setup</span>
            </div>
            <h1 className="mt-3 text-xl font-semibold text-white">Install for kiosk mode</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The browser address bar only disappears when Kiosk runs as an installed app or in
              fullscreen. This page must be installed from <strong className="text-zinc-200">/kiosk</strong>.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {installPrompt ? (
              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={busy}
                onClick={() => void handleInstall()}
              >
                <Download className="h-4 w-4" />
                {busy ? 'Installing…' : 'Install Kiosk app'}
              </Button>
            ) : null}

            <Button
              type="button"
              variant={installPrompt ? 'secondary' : 'primary'}
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => void handleFullscreen()}
            >
              <Maximize2 className="h-4 w-4" />
              Enter fullscreen
            </Button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              onClick={() => recheckDisplayMode()}
            >
              <RefreshCw className="h-4 w-4" />
              I already installed it
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-left text-xs leading-relaxed text-zinc-500">
            {ios ? (
              <p>
                On iPhone/iPad: tap <strong className="text-zinc-300">Share</strong> →{' '}
                <strong className="text-zinc-300">Add to Home Screen</strong>, then open the{' '}
                <strong className="text-zinc-300">Kiosk</strong> icon (not Safari).
              </p>
            ) : (
              <p>
                On Android: open <strong className="text-zinc-300">/kiosk</strong> in Chrome → menu →{' '}
                <strong className="text-zinc-300">Install app</strong>. Use the{' '}
                <strong className="text-zinc-300">Kiosk</strong> icon, not TimeTracker.
              </p>
            )}
          </div>

          {message ? <p className="mt-4 text-center text-sm text-amber-300">{message}</p> : null}
        </div>
      </div>
    </>
  );
}
