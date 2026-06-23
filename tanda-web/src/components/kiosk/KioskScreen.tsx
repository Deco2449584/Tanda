'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
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
      setToast(createToast('Please enter your PIN.', 'error'));
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
          createToast(data?.error ?? 'Could not validate PIN. Please try again.', 'error'),
        );
        return;
      }

      if (!data) {
        setToast(createToast('Could not validate PIN. Please try again.', 'error'));
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
      setToast(createToast('Session expired. Enter your PIN again.', 'error'));
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

      const response = await fetch('/api/kiosk/punch', {
        method: 'POST',
        headers: kioskDeviceHeaders(),
        body: JSON.stringify({
          employeePin: pin.trim(),
          photoPath,
          photoUrl,
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
    <div className="relative flex min-h-[100dvh] max-h-[100dvh] w-full flex-col items-center justify-between overflow-hidden bg-zinc-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-4">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-zinc-900/90 px-4 py-2 text-xs text-zinc-200 backdrop-blur">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">
            Clocking in at: <strong className="font-semibold text-white">{warehouseLabel}</strong>
          </span>
        </div>
      </div>

      {step === 'pin' ? (
        <>
          <div className="mt-12 flex shrink-0 flex-col items-center gap-6">
            {showLogo && (
              <CompanyLogo
                priority
                invert
                className="h-16 w-auto shrink-0 brightness-0 invert drop-shadow-md"
              />
            )}
            <KioskClock />
          </div>

          <div className="flex w-full max-w-[640px] shrink-0 flex-col items-center gap-4">
            <KioskPinPad
              pin={pin}
              loading={loading}
              onDigit={handleDigit}
              onBackspace={() => setPin((prev) => prev.slice(0, -1))}
              onClear={() => setPin('')}
              onSubmit={() => void handleValidatePin()}
            />
          </div>
        </>
      ) : (
        <div className="mt-12 flex min-h-0 w-full max-w-[640px] flex-1 flex-col items-center justify-center">
          {showLogo && (
            <CompanyLogo
              priority
              invert
              className="mb-6 h-12 w-auto shrink-0 brightness-0 invert drop-shadow-md md:h-16"
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
