'use client';

import { useCallback, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Webcam from 'react-webcam';

interface KioskCameraProps {
  actionType: 'check_in' | 'check_out';
  employeeName: string;
  processing: boolean;
  onCapture: (imageBlob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

const videoConstraints: MediaTrackConstraints = {
  facingMode: 'user',
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

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
}: KioskCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const actionLabel = actionType === 'check_out' ? 'Clock Out' : 'Clock In';

  const handleCapture = useCallback(() => {
    if (processing) return;

    const screenshot = webcamRef.current?.getScreenshot({
      width: 1280,
      height: 720,
    });
    if (!screenshot) {
      setCameraError('Could not capture photo. Please try again.');
      return;
    }
    setCameraError(null);
    onCapture(dataUrlToBlob(screenshot), screenshot);
  }, [onCapture, processing]);

  return (
    <div className="flex w-full max-w-2xl shrink-0 flex-col items-center gap-2 px-2 md:gap-4 md:px-4">
      <div className="shrink-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs md:tracking-[0.25em]">
          Photo verification
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-white md:mt-2 md:text-3xl">
          {employeeName || 'Employee'}
        </h2>
        <p className="text-xs text-zinc-400 md:text-sm">
          {actionLabel}
        </p>
      </div>

      <div className="flex w-full min-h-0 flex-1 flex-col items-center">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/80 bg-black shadow-2xl ring-1 ring-primary/10">
          <div className="relative mx-auto aspect-square max-h-[36vh] w-full md:max-h-[50vh]">
            {cameraError ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-red-200 md:p-8 md:text-sm">
                {cameraError}
              </div>
            ) : (
              <>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.85}
                  videoConstraints={videoConstraints}
                  onUserMediaError={() =>
                    setCameraError(
                      'Camera access denied. Allow the camera in your browser settings.',
                    )
                  }
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
