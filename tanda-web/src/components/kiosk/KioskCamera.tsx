'use client';

import { useCallback, useRef, useState } from 'react';
import Webcam from 'react-webcam';

interface KioskCameraProps {
  actionType: 'check_in' | 'check_out';
  employeeName: string;
  saving: boolean;
  onCapture: (imageBlob: Blob) => void;
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

export function KioskCamera({
  actionType,
  employeeName,
  saving,
  onCapture,
  onCancel,
}: KioskCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const actionLabel = actionType === 'check_out' ? 'Clock Out' : 'Clock In';

  const handleCapture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot({
      width: 1280,
      height: 720,
    });
    if (!screenshot) {
      setCameraError('Could not capture photo. Please try again.');
      return;
    }
    setCameraError(null);
    onCapture(dataUrlToBlob(screenshot));
  }, [onCapture]);

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-5 px-4">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
          {actionLabel}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          {employeeName || 'Employee'}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Center your face and tap capture
        </p>
      </div>

      <div className="relative w-full overflow-hidden rounded-3xl border border-blue-300/30 bg-black shadow-2xl">
        {cameraError ? (
          <div className="flex aspect-[4/3] items-center justify-center p-6 text-center text-sm text-red-200">
            {cameraError}
          </div>
        ) : (
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
            className="aspect-[4/3] w-full object-cover"
            mirrored
          />
        )}
        <div className="pointer-events-none absolute inset-8 rounded-[999px] border-2 border-blue-400/40" />
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={saving || !!cameraError}
          onClick={handleCapture}
          className="min-h-14 flex-1 rounded-full border border-blue-300/35 bg-blue-600 px-6 text-lg font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : actionLabel}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="min-h-14 flex-1 rounded-full border border-zinc-600 bg-zinc-800 px-6 text-lg font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
