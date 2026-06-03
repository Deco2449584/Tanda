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
      <div className="relative h-[72%] w-[58%] max-w-sm">
        <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-lg border-l-[3px] border-t-[3px] border-blue-400/90" />
        <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-lg border-r-[3px] border-t-[3px] border-blue-400/90" />
        <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-lg border-b-[3px] border-l-[3px] border-blue-400/90" />
        <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-lg border-b-[3px] border-r-[3px] border-blue-400/90" />
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-blue-400/20" />
        <div className="absolute left-1/2 inset-y-0 w-px -translate-x-1/2 bg-blue-400/20" />
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-medium uppercase tracking-widest text-white/70">
        Align your face within the frame
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
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 px-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
          Photo verification
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
          {employeeName || 'Employee'}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {actionLabel} · Center your face and capture
        </p>
      </div>

      <div className="relative w-full">
        <div className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-black shadow-2xl ring-1 ring-blue-500/10">
          <div className="relative aspect-[4/3] w-full">
            {cameraError ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-red-200">
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
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-950/75 backdrop-blur-sm">
                <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-500/30 border-t-blue-500" />
                <p className="text-lg font-semibold tracking-wide text-white">
                  Processing…
                </p>
                <p className="text-sm text-zinc-400">
                  Uploading photo and saving record
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            disabled={processing || !!cameraError}
            onClick={handleCapture}
            aria-label={`Capture photo for ${actionLabel}`}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-400/50 bg-blue-600 text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:h-24 md:w-24"
          >
            <Camera className="h-9 w-9 md:h-10 md:w-10" strokeWidth={2} />
          </button>
          <p className="text-sm font-medium text-zinc-400">
            Tap to capture
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={processing}
        onClick={onCancel}
        className="min-h-12 rounded-full border border-zinc-600 bg-zinc-800/80 px-8 text-base font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
