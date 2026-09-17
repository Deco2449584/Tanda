'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import Webcam from 'react-webcam';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';
import { formatKioskActionLabel } from '@/lib/kiosk/kiosk-action-labels';
import {
  cameraErrorHelpText,
  permissionUnblockSteps,
  queryBrowserPermission,
  requestCameraAccess,
} from '@/lib/permissions/browser-permissions';
import type { AttendanceType } from '@/lib/types/attendance';

interface KioskCameraProps {
  actionType: AttendanceType;
  employeeName: string;
  processing: boolean;
  onCapture: (imageFile: File, previewUrl: string) => void;
  onCancel: () => void;
  onError?: (message: string) => void;
}

const videoConstraints: MediaTrackConstraints = {
  facingMode: { ideal: 'user' },
};

function FaceGuideOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-[72%] w-[58%] max-w-[220px] md:max-w-sm">
        <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-[3px] border-t-[3px] border-primary/90 md:h-10 md:w-10" />
        <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-[3px] border-t-[3px] border-primary/90 md:h-10 md:w-10" />
        <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-[3px] border-l-[3px] border-primary/90 md:h-10 md:w-10" />
        <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-[3px] border-r-[3px] border-primary/90 md:h-10 md:w-10" />
      </div>
      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-widest text-white/70 md:bottom-4 md:text-xs">
        Align your face
      </p>
    </div>
  );
}

export function KioskCamera({
  actionType,
  employeeName,
  processing,
  onCapture,
  onCancel,
  onError,
}: KioskCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [blockedPermanently, setBlockedPermanently] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [useFallbackVideo, setUseFallbackVideo] = useState(false);

  const actionLabel = formatKioskActionLabel(actionType);

  const remountCamera = useCallback(() => {
    setBlockedPermanently(false);
    setUseFallbackVideo(false);
    setCameraError(null);
    setCameraKey((key) => key + 1);
  }, []);

  const markBlocked = useCallback(
    (message: string, permanent: boolean) => {
      setBlockedPermanently(permanent);
      setCameraError(message);
      onError?.(message);
    },
    [onError],
  );

  /** When the user returns from Android/Chrome settings, pick up the new grant. */
  useEffect(() => {
    if (!cameraError) return;

    async function recheck() {
      const state = await queryBrowserPermission('camera');
      if (state === 'granted') {
        remountCamera();
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible') {
        void recheck();
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    let permissionStatus: PermissionStatus | null = null;
    let cancelled = false;
    void (async () => {
      try {
        if (!navigator.permissions?.query) return;
        permissionStatus = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        if (cancelled) return;
        const onChange = () => {
          if (permissionStatus?.state === 'granted') {
            remountCamera();
          } else if (permissionStatus?.state === 'denied') {
            setBlockedPermanently(true);
          }
        };
        permissionStatus.addEventListener('change', onChange);
      } catch {
        // ignore unsupported query
      }
    })();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [cameraError, remountCamera]);

  const handleRetryCamera = useCallback(async () => {
    setRetrying(true);
    try {
      const prior = await queryBrowserPermission('camera');

      // Permanently blocked: browser will not show a dialog — don't pretend to ask.
      if (prior === 'denied') {
        markBlocked(cameraErrorHelpText({ name: 'NotAllowedError' }), true);
        return;
      }

      if (prior === 'granted') {
        remountCamera();
        return;
      }

      // State is "prompt" — this click can still open the system dialog.
      const state = await requestCameraAccess();
      if (state === 'granted') {
        remountCamera();
        return;
      }
      if (state === 'unavailable') {
        markBlocked(cameraErrorHelpText({ name: 'NotFoundError' }), false);
        return;
      }
      markBlocked(cameraErrorHelpText({ name: 'NotAllowedError' }), true);
    } finally {
      setRetrying(false);
    }
  }, [markBlocked, remountCamera]);

  const handleCapture = useCallback(async () => {
    if (processing) return;

    const screenshot = webcamRef.current?.getScreenshot({
      width: 960,
      height: 540,
    });
    if (!screenshot) {
      const message = 'Could not capture photo. Please try again.';
      markBlocked(message, false);
      return;
    }

    setCameraError(null);
    setBlockedPermanently(false);
    try {
      const optimized = await optimizeImageForUpload(screenshot, 'attendance');
      const previewUrl = URL.createObjectURL(optimized);
      onCapture(optimized, previewUrl);
    } catch {
      markBlocked('Could not process photo. Please try again.', false);
    }
  }, [markBlocked, onCapture, processing]);

  return (
    <div className="flex w-full max-w-2xl shrink-0 flex-col items-center gap-2 px-2 md:gap-4 md:px-4">
      <div className="shrink-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs md:tracking-[0.25em]">
          Photo verification
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-white md:mt-2 md:text-3xl">
          {employeeName || 'Employee'}
        </h2>
        <p className="text-xs text-zinc-400 md:text-sm">{actionLabel}</p>
      </div>

      <div className="flex w-full min-h-0 flex-1 flex-col items-center">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/80 bg-black shadow-2xl ring-1 ring-primary/10">
          <div className="relative mx-auto aspect-square max-h-[42vh] w-full md:max-h-[50vh]">
            {cameraError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2.5 overflow-y-auto bg-red-950/40 p-4 text-center md:p-6">
                <p className="text-sm font-semibold text-red-100">{cameraError}</p>

                {blockedPermanently ? (
                  <ol className="w-full list-decimal space-y-1.5 rounded-xl border border-red-200/20 bg-black/30 px-4 py-3 text-left text-[11px] leading-snug text-red-100/90">
                    {permissionUnblockSteps('camera').map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                ) : null}

                <div className="flex w-full flex-col gap-2">
                  {!blockedPermanently ? (
                    <button
                      type="button"
                      disabled={processing || retrying}
                      onClick={() => void handleRetryCamera()}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200/40 bg-red-900/50 px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-800/60 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`}
                      />
                      {retrying ? 'Asking…' : 'Allow camera'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={processing || retrying}
                      onClick={() => void handleRetryCamera()}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200/40 bg-red-900/50 px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-800/60 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`}
                      />
                      {retrying ? 'Checking…' : 'I’ve allowed it — Continue'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Webcam
                  key={`${cameraKey}-${useFallbackVideo ? 'fallback' : 'ideal'}`}
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.85}
                  videoConstraints={
                    useFallbackVideo ? true : videoConstraints
                  }
                  onUserMediaError={(err) => {
                    const name =
                      typeof err === 'string'
                        ? err
                        : err && typeof err === 'object' && 'name' in err
                          ? String((err as { name?: string }).name)
                          : '';
                    if (
                      !useFallbackVideo &&
                      (name === 'OverconstrainedError' ||
                        name === 'NotFoundError' ||
                        name === 'DevicesNotFoundError')
                    ) {
                      setUseFallbackVideo(true);
                      setCameraKey((key) => key + 1);
                      return;
                    }
                    const permanent =
                      name === 'NotAllowedError' ||
                      name === 'PermissionDeniedError';
                    markBlocked(
                      cameraErrorHelpText(
                        typeof err === 'string' ? { name: err } : err,
                      ),
                      permanent,
                    );
                  }}
                  className="h-full w-full object-cover"
                  mirrored
                />
                <FaceGuideOverlay />
              </>
            )}

            {processing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-950/75 backdrop-blur-sm md:gap-4">
                <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary md:h-12 md:w-12" />
                <p className="text-base font-semibold tracking-wide text-white md:text-lg">
                  Processing…
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex shrink-0 flex-col items-center gap-1 md:mt-5 md:gap-2">
          <button
            type="button"
            disabled={processing || !!cameraError}
            onClick={handleCapture}
            aria-label={`Capture photo for ${actionLabel}`}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/50 bg-primary text-white shadow-lg shadow-black/40 transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:h-24 md:w-24"
          >
            <Camera className="h-7 w-7 md:h-10 md:w-10" strokeWidth={2} />
          </button>
          <p className="text-xs font-medium text-zinc-400 md:text-sm">
            Tap to capture
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={processing}
        onClick={onCancel}
        className="shrink-0 rounded-full border border-zinc-600 bg-zinc-800/80 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50 md:min-h-12 md:px-8 md:text-base"
      >
        Cancel
      </button>
    </div>
  );
}
