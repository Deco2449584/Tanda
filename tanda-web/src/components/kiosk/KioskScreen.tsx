'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, MapPin } from 'lucide-react';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { captureCurrentPosition } from '@/lib/geo/capture-position';
import { KioskClock } from '@/components/kiosk/KioskClock';
import { KioskCamera } from '@/components/kiosk/KioskCamera';
import { KioskPinPad } from '@/components/kiosk/KioskPinPad';
import {
  KioskSuccessModal,
  type KioskSuccessData,
} from '@/components/kiosk/KioskSuccessModal';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { kioskDeviceHeaders } from '@/lib/kiosk/device-token';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

type KioskStep = 'pin' | 'camera' | 'success';

const PIN_LENGTH = 4;
const SUCCESS_AUTO_RESET_MS = 2600;

interface KioskSession {
  employeeId: string;
  employeeName: string;
  actionType: 'check_in' | 'check_out';
}

function createToast(
  text: string,
  variant: ToastMessage['variant'],
): ToastMessage {
  return { id: crypto.randomUUID(), text, variant };
}

interface KioskScreenProps {
  deviceSession: KioskDeviceSession;
  onExit?: () => void;
  exitLabel?: string;
}

export function KioskScreen({ deviceSession, onExit, exitLabel = 'Exit' }: KioskScreenProps) {
  const [step, setStep] = useState<KioskStep>('pin');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<KioskSession | null>(null);
  const [successData, setSuccessData] = useState<KioskSuccessData | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const warehouseLabel =
    deviceSession.locationName && deviceSession.locationCity
      ? `${deviceSession.locationName} (${deviceSession.locationCity})`
      : deviceSession.locationName || 'Assigned warehouse';

  const resetToPin = useCallback(() => {
    setSuccessData((current) => {
      if (current?.photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(current.photoPreviewUrl);
      }
      return null;
    });
    setStep('pin');
    setPin('');
    setSession(null);
    setProcessing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (step !== 'success' || !successData) return;

    const timer = window.setTimeout(() => {
      resetToPin();
    }, SUCCESS_AUTO_RESET_MS);

    return () => window.clearTimeout(timer);
  }, [step, successData, resetToPin]);

  const validatePin = useCallback(
    async (value: string) => {
      if (value.length !== PIN_LENGTH) {
        return;
      }

      setLoading(true);

      try {
        const response = await fetch('/api/kiosk/lookup', {
          method: 'POST',
          headers: kioskDeviceHeaders(),
          body: JSON.stringify({ employeePin: value }),
        });

        const data = (await response.json().catch(() => null)) as
          | {
              employeeId: string;
              employeeName: string;
              actionType: 'check_in' | 'check_out';
              error?: string;
            }
          | null;

        if (!response.ok || !data) {
          setToast(
            createToast(data?.error ?? 'Could not validate ID. Please try again.', 'error'),
          );
          setPin('');
          return;
        }

        setSession({
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          actionType: data.actionType,
        });
        setStep('camera');
      } catch (error) {
        console.error('Kiosk PIN validation failed:', error);
        setToast(createToast('Could not validate PIN. Please try again.', 'error'));
        setPin('');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleDigit = (digit: string) => {
    if (loading) return;
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + digit;
      if (next.length === PIN_LENGTH) {
        window.setTimeout(() => void validatePin(next), 120);
      }
      return next;
    });
  };

  const submitPunchInBackground = useCallback(
    (params: {
      imageBlob: Blob;
      employeeId: string;
      employeePin: string;
      actionType: 'check_in' | 'check_out';
    }) => {
      void (async () => {
        try {
          const now = new Date();
          const year = String(now.getFullYear());
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const fileName = `${Date.now()}-${params.actionType}.webp`;
          const photoPath = `attendance/${params.employeeId}/${year}/${month}/${fileName}`;

          const [photoUrl, geo] = await Promise.all([
            uploadImageToStorage(photoPath, params.imageBlob),
            captureCurrentPosition(),
          ]);

          const response = await fetch('/api/kiosk/punch', {
            method: 'POST',
            headers: kioskDeviceHeaders(),
            body: JSON.stringify({
              employeePin: params.employeePin,
              photoPath,
              photoUrl,
              ...(geo
                ? {
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                    geoAccuracy: geo.accuracy,
                    geoCapturedAt: geo.geoCapturedAt,
                  }
                : {}),
            }),
          });

          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(data?.error ?? 'Could not save attendance.');
          }
        } catch (error) {
          console.error('Kiosk background punch failed:', error);
          setToast(
            createToast(
              error instanceof Error
                ? error.message
                : 'Could not save the record. Please try again.',
              'error',
            ),
          );
        }
      })();
    },
    [],
  );

  const handleCapture = (imageBlob: Blob, previewDataUrl: string) => {
    if (!session) {
      setToast(createToast('Session expired. Enter your ID again.', 'error'));
      resetToPin();
      return;
    }

    // Optimistic: show success immediately, upload + record in the background.
    setSuccessData({
      employeeName: session.employeeName,
      actionType: session.actionType,
      recordedAt: new Date(),
      photoPreviewUrl: previewDataUrl,
      warehouseLabel,
    });
    setStep('success');

    submitPunchInBackground({
      imageBlob,
      employeeId: session.employeeId,
      employeePin: pin,
      actionType: session.actionType,
    });
  };

  const showLogo = step !== 'success';

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(125%_85%_at_50%_-10%,#13224a_0%,#0a1020_42%,#05070d_100%)] text-white">
      {onExit ? (
        <button
          type="button"
          onClick={onExit}
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur transition hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          {exitLabel}
        </button>
      ) : null}

      <header className="z-20 flex shrink-0 flex-col items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] lg:landscape:gap-4">
        {step === 'pin' && showLogo && (
          <CompanyLogo
            priority
            variant="light"
            className="h-auto w-[min(84vw,18rem)] max-h-[5.25rem] shrink-0 object-contain drop-shadow-lg lg:landscape:w-[min(100%,20rem)] lg:landscape:max-h-[6rem]"
          />
        )}
        <div className="inline-flex max-w-[92%] items-center gap-2 rounded-full border border-primary/30 bg-white/[0.04] px-4 py-2 text-[clamp(0.65rem,1.6vh,0.8rem)] text-zinc-200 shadow-lg backdrop-blur">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">
            Clocking in at:{' '}
            <strong className="font-semibold text-white">{warehouseLabel}</strong>
          </span>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 max-lg:landscape:pt-3 lg:landscape:py-[clamp(1.5rem,4.5vh,2.5rem)]">
        {step === 'pin' ? (
          <div className="flex w-full max-w-sm flex-col items-stretch gap-4 max-lg:landscape:gap-3 lg:landscape:min-h-[min(68vh,520px)] lg:landscape:max-w-4xl lg:landscape:flex-row lg:landscape:items-stretch lg:landscape:gap-8">
            <div className="flex w-full min-w-0 lg:landscape:flex-1">
              <KioskClock />
            </div>

            <div className="flex w-full min-w-0 lg:landscape:flex-1">
              <KioskPinPad
                pin={pin}
                loading={loading}
                maxLength={PIN_LENGTH}
                onDigit={handleDigit}
                onBackspace={() => setPin((prev) => prev.slice(0, -1))}
                onClear={() => setPin('')}
                onSubmit={() => void validatePin(pin)}
              />
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-2xl flex-col items-center">
            {showLogo && (
              <CompanyLogo
                priority
                variant="light"
                className="mb-[clamp(1rem,3vh,1.5rem)] h-auto w-[min(88vw,20rem)] max-h-[clamp(5.5rem,14vh,9rem)] shrink-0 object-contain drop-shadow-lg"
              />
            )}

            {step === 'camera' && session && (
              <KioskCamera
                actionType={session.actionType}
                employeeName={session.employeeName}
                processing={processing}
                onCapture={(blob, previewUrl) => handleCapture(blob, previewUrl)}
                onCancel={resetToPin}
              />
            )}

            {step === 'success' && successData && (
              <KioskSuccessModal data={successData} />
            )}
          </div>
        )}
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
