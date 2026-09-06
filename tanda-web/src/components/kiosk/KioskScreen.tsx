'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, MapPin, Settings } from 'lucide-react';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { captureCurrentPosition } from '@/lib/geo/capture-position';
import { KioskClock } from '@/components/kiosk/KioskClock';
import { KioskCamera } from '@/components/kiosk/KioskCamera';
import { KioskPinPad } from '@/components/kiosk/KioskPinPad';
import { KioskAlert } from '@/components/kiosk/KioskAlert';
import { KioskActionChooser } from '@/components/kiosk/KioskActionChooser';
import {
  KioskSuccessModal,
  type KioskSuccessData,
} from '@/components/kiosk/KioskSuccessModal';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { getKioskAuthHeaders } from '@/lib/kiosk/kiosk-auth-headers';
import { recordLocalKioskPunch } from '@/lib/kiosk/local-punch-history';
import type { AttendanceType } from '@/lib/types/attendance';

type KioskStep = 'pin' | 'choose' | 'camera' | 'success';

const PIN_LENGTH = 4;
const SUCCESS_AUTO_RESET_MS = 2600;

interface KioskSession {
  employeeId: string;
  employeeName: string;
  actionType: AttendanceType;
  allowedActions: AttendanceType[];
}

interface KioskScreenProps {
  locationId: string;
  locationLabel: string;
  onExit?: () => void;
  onOpenSettings?: () => void;
  exitLabel?: string;
}

export function KioskScreen({
  locationId,
  locationLabel,
  onExit,
  onOpenSettings,
  exitLabel = 'Exit',
}: KioskScreenProps) {
  const [step, setStep] = useState<KioskStep>('pin');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<KioskSession | null>(null);
  const [successData, setSuccessData] = useState<KioskSuccessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const warehouseLabel = locationLabel || 'Assigned client';

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

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const validatePin = useCallback(
    async (value: string) => {
      if (value.length !== PIN_LENGTH) {
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch('/api/kiosk/lookup', {
          method: 'POST',
          headers: await getKioskAuthHeaders(),
          body: JSON.stringify({ employeePin: value, locationId }),
        });

        const data = (await response.json().catch(() => null)) as
          | {
              employeeId: string;
              employeeName: string;
              actionType: AttendanceType;
              allowedActions?: AttendanceType[];
              error?: string;
            }
          | null;

        if (!response.ok || !data) {
          showError(data?.error ?? 'Could not validate ID. Please try again.');
          setPin('');
          return;
        }

        const allowedActions =
          Array.isArray(data.allowedActions) && data.allowedActions.length > 0
            ? data.allowedActions
            : [data.actionType];

        const nextSession: KioskSession = {
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          actionType: data.actionType,
          allowedActions,
        };

        setSession(nextSession);

        if (allowedActions.length > 1) {
          setStep('choose');
        } else {
          setStep('camera');
        }
      } catch (error) {
        console.error('Kiosk PIN validation failed:', error);
        showError('Could not validate PIN. Please try again.');
        setPin('');
      } finally {
        setLoading(false);
      }
    },
    [locationId, showError],
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
      employeeName: string;
      employeePin: string;
      actionType: AttendanceType;
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
            headers: await getKioskAuthHeaders(),
            body: JSON.stringify({
              employeePin: params.employeePin,
              locationId,
              photoPath,
              photoUrl,
              actionType: params.actionType,
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

          recordLocalKioskPunch({
            employeeId: params.employeeId,
            employeeName: params.employeeName,
            actionType: params.actionType,
            locationId,
            locationName: warehouseLabel,
            createdAt: now,
          });
        } catch (error) {
          console.error('Kiosk background punch failed:', error);
          showError(
            error instanceof Error
              ? error.message
              : 'Could not save the record. Please try again.',
          );
        }
      })();
    },
    [locationId, showError, warehouseLabel],
  );

  const handleCapture = (imageBlob: Blob, previewDataUrl: string) => {
    if (!session) {
      showError('Session expired. Enter your ID again.');
      resetToPin();
      return;
    }

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
      employeeName: session.employeeName,
      employeePin: pin,
      actionType: session.actionType,
    });
  };

  const showLogo = step !== 'success';

  return (
    <div className="kiosk-ambient relative flex min-h-[100dvh] w-full flex-col text-white">
      {errorMessage ? (
        <KioskAlert message={errorMessage} onDismiss={() => setErrorMessage(null)} />
      ) : null}

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-2">
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Kiosk settings"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 p-2 text-zinc-300 backdrop-blur transition hover:text-white"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur transition hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            {exitLabel}
          </button>
        ) : null}
      </div>

      <header className="z-20 flex shrink-0 flex-col items-center gap-2 px-4 pb-1.5 pt-[max(0.5rem,env(safe-area-inset-top))] md:landscape:gap-3">
        {step === 'pin' && showLogo && (
          <CompanyLogo
            priority
            variant="light"
            className="h-auto w-[min(72vw,15rem)] max-h-[4.25rem] shrink-0 object-contain drop-shadow-lg md:landscape:w-[min(100%,16rem)] md:landscape:max-h-[4.75rem]"
          />
        )}
        <div className="inline-flex max-w-[92%] items-center gap-2 rounded-full border border-primary/30 bg-white/[0.04] px-3.5 py-1.5 text-[clamp(0.6rem,1.4vh,0.75rem)] text-zinc-200 shadow-lg backdrop-blur">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">
            Clocking in at:{' '}
            <strong className="font-semibold text-white">{warehouseLabel}</strong>
          </span>
        </div>
      </header>

      <main className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 max-md:landscape:pt-2 md:landscape:py-[clamp(0.75rem,2.5vh,1.75rem)]">
        {step === 'pin' ? (
          <div className="flex w-full max-w-sm min-h-0 flex-col items-stretch gap-3 max-md:landscape:gap-2 md:landscape:h-full md:landscape:max-h-[min(78vh,560px)] md:landscape:max-w-5xl md:landscape:flex-row md:landscape:items-stretch md:landscape:gap-6">
            <div className="flex w-full min-h-0 min-w-0 max-md:landscape:max-h-[28vh] md:landscape:flex-1">
              <KioskClock />
            </div>

            <div className="flex w-full min-h-0 min-w-0 md:landscape:flex-[1.15]">
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

            {step === 'choose' && session ? (
              <KioskActionChooser
                employeeName={session.employeeName}
                allowedActions={session.allowedActions}
                onSelect={(actionType) => {
                  setSession((current) =>
                    current ? { ...current, actionType } : current,
                  );
                  setStep('camera');
                }}
                onCancel={resetToPin}
              />
            ) : null}

            {step === 'camera' && session && (
              <KioskCamera
                actionType={session.actionType}
                employeeName={session.employeeName}
                processing={processing}
                onCapture={(blob, previewUrl) => handleCapture(blob, previewUrl)}
                onCancel={resetToPin}
                onError={showError}
              />
            )}

            {step === 'success' && successData && (
              <KioskSuccessModal data={successData} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
