'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
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

const SUCCESS_AUTO_RESET_MS = 4000;

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
}

export function KioskScreen({ deviceSession }: KioskScreenProps) {
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

  const handleDigit = (digit: string) => {
    if (pin.length >= 8) return;
    setPin((prev) => prev + digit);
  };

  const handleValidatePin = async () => {
    if (!pin.trim()) {
      setToast(createToast('Please enter your ID.', 'error'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/kiosk/lookup', {
        method: 'POST',
        headers: kioskDeviceHeaders(),
        body: JSON.stringify({ employeePin: pin.trim() }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            employeeId: string;
            employeeName: string;
            actionType: 'check_in' | 'check_out';
            error?: string;
          }
        | null;

      if (!response.ok) {
        setToast(
          createToast(data?.error ?? 'Could not validate ID. Please try again.', 'error'),
        );
        return;
      }

      if (!data) {
        setToast(createToast('Could not validate ID. Please try again.', 'error'));
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
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (imageBlob: Blob, previewDataUrl: string) => {
    if (!session) {
      setToast(createToast('Session expired. Enter your ID again.', 'error'));
      resetToPin();
      return;
    }

    setProcessing(true);
    const recordedAt = new Date();

    try {
      const year = String(recordedAt.getFullYear());
      const month = String(recordedAt.getMonth() + 1).padStart(2, '0');
      const fileName = `${Date.now()}-${session.actionType}.webp`;
      const photoPath = `attendance/${session.employeeId}/${year}/${month}/${fileName}`;

      const photoUrl = await uploadImageToStorage(photoPath, imageBlob);

      const geo = await captureCurrentPosition();

      const response = await fetch('/api/kiosk/punch', {
        method: 'POST',
        headers: kioskDeviceHeaders(),
        body: JSON.stringify({
          employeePin: pin.trim(),
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

      const data = (await response.json().catch(() => null)) as
        | { employeeName: string; actionType: 'check_in' | 'check_out'; error?: string }
        | null;

      if (!response.ok) {
        setToast(
          createToast(data?.error ?? 'Could not save attendance. Please try again.', 'error'),
        );
        return;
      }

      setSuccessData({
        employeeName: data?.employeeName ?? session.employeeName,
        actionType: data?.actionType ?? session.actionType,
        recordedAt,
        photoPreviewUrl: previewDataUrl,
        warehouseLabel,
      });
      setStep('success');
    } catch (error) {
      console.error('Kiosk capture save failed:', error);
      setToast(createToast('Could not save attendance. Please try again.', 'error'));
    } finally {
      setProcessing(false);
    }
  };

  const showLogo = step !== 'success';

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(125%_85%_at_50%_-10%,#13224a_0%,#0a1020_42%,#05070d_100%)] text-white">
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
                onDigit={handleDigit}
                onBackspace={() => setPin((prev) => prev.slice(0, -1))}
                onClear={() => setPin('')}
                onSubmit={() => void handleValidatePin()}
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
                onCapture={(blob, previewUrl) => void handleCapture(blob, previewUrl)}
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
