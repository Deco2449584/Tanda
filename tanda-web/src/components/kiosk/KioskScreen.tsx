'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LogOut, MapPin, Settings } from 'lucide-react';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
import {
  captureCurrentPositionResult,
  captureGeofencePositionResult,
  LOCATION_PERMISSION_DENIED_MESSAGE,
  type CapturedGeoPosition,
} from '@/lib/geo/capture-position';
import { KioskClock } from '@/components/kiosk/KioskClock';
import { KioskCamera } from '@/components/kiosk/KioskCamera';
import { KioskPinPad } from '@/components/kiosk/KioskPinPad';
import { KioskAlert } from '@/components/kiosk/KioskAlert';
import { KioskActionChooser } from '@/components/kiosk/KioskActionChooser';
import { KioskConfirmPunch } from '@/components/kiosk/KioskConfirmPunch';
import {
  KioskSuccessModal,
  type KioskSuccessData,
} from '@/components/kiosk/KioskSuccessModal';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { getKioskAuthHeaders } from '@/lib/kiosk/kiosk-auth-headers';
import { recordLocalKioskPunch } from '@/lib/kiosk/local-punch-history';
import type { AttendanceType } from '@/lib/types/attendance';

type KioskStep = 'pin' | 'choose' | 'camera' | 'confirm' | 'saving' | 'success';

interface PendingCapture {
  imageBlob: Blob;
  previewUrl: string;
}

const PIN_LENGTH = 4;
const SUCCESS_AUTO_RESET_MS = 2600;

interface KioskSession {
  employeeId: string;
  employeeName: string;
  actionType: AttendanceType;
  allowedActions: AttendanceType[];
  /** This client only accepts punches made inside its geofence. */
  geofenceRequired: boolean;
}

const GEOFENCE_GPS_MISSING =
  'Location is required to clock in at this client. Tap Try again to allow location. If the browser does not ask, open the lock icon → Site settings → Location → Allow, then reload.';

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
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(
    null,
  );
  const [successData, setSuccessData] = useState<KioskSuccessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Started right after the PIN so the fix is ready when the photo is confirmed.
  const geoFixRef = useRef<Promise<CapturedGeoPosition | null> | null>(null);

  const warehouseLabel = locationLabel || 'Assigned client';

  const clearPendingCapture = useCallback(() => {
    setPendingCapture((current) => {
      if (current?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }, []);

  const resetToPin = useCallback(() => {
    clearPendingCapture();
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
    geoFixRef.current = null;
  }, [clearPendingCapture]);

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
              geofenceRequired?: boolean;
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

        const geofenceRequired = data.geofenceRequired === true;
        const nextSession: KioskSession = {
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          actionType: data.actionType,
          allowedActions,
          geofenceRequired,
        };

        geoFixRef.current = (geofenceRequired
          ? captureGeofencePositionResult()
          : captureCurrentPositionResult()
        ).then((result) => (result.ok ? result.position : null));

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

  const submitPunch = useCallback(
    async (params: {
      imageBlob: Blob;
      employeeId: string;
      employeeName: string;
      employeePin: string;
      actionType: AttendanceType;
      geofenceRequired: boolean;
      photoPreviewUrl: string;
    }) => {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fileName = `${Date.now()}-${params.actionType}.webp`;
      const photoPath = `attendance/${params.employeeId}/${year}/${month}/${fileName}`;

      const pendingGeo =
        geoFixRef.current ??
        (params.geofenceRequired
          ? captureGeofencePositionResult()
          : captureCurrentPositionResult()
        ).then((result) => {
          if (!result.ok && result.reason === 'permission_denied') {
            throw new Error(LOCATION_PERMISSION_DENIED_MESSAGE);
          }
          return result.ok ? result.position : null;
        });
      geoFixRef.current = null;

      let geo: CapturedGeoPosition | null;
      try {
        geo = await pendingGeo;
      } catch (geoError) {
        if (
          geoError instanceof Error &&
          geoError.message === LOCATION_PERMISSION_DENIED_MESSAGE
        ) {
          throw geoError;
        }
        geo = null;
      }

      // If the early geo promise resolved to null, try once more so the browser
      // can show the permission prompt again after the user taps Confirm.
      if (params.geofenceRequired && !geo) {
        const retry = await captureGeofencePositionResult();
        if (!retry.ok && retry.reason === 'permission_denied') {
          throw new Error(LOCATION_PERMISSION_DENIED_MESSAGE);
        }
        geo = retry.ok ? retry.position : null;
      }

      if (params.geofenceRequired && !geo) {
        throw new Error(GEOFENCE_GPS_MISSING);
      }

      const photoUrl = await uploadImageToStorage(photoPath, params.imageBlob);

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

      return {
        employeeName: params.employeeName,
        actionType: params.actionType,
        recordedAt: now,
        photoPreviewUrl: params.photoPreviewUrl,
        warehouseLabel,
      } satisfies KioskSuccessData;
    },
    [locationId, warehouseLabel],
  );

  const handleCapture = (imageBlob: Blob, previewDataUrl: string) => {
    if (!session) {
      showError('Session expired. Enter your ID again.');
      resetToPin();
      return;
    }

    clearPendingCapture();
    setPendingCapture({
      imageBlob,
      previewUrl: previewDataUrl,
    });
    setStep('confirm');
  };

  const handleConfirmAccept = () => {
    if (!session || !pendingCapture) {
      showError('Session expired. Enter your ID again.');
      resetToPin();
      return;
    }

    const { imageBlob, previewUrl } = pendingCapture;
    const currentSession = session;
    const currentPin = pin;

    setErrorMessage(null);
    setProcessing(true);
    setStep('saving');

    void (async () => {
      try {
        const data = await submitPunch({
          imageBlob,
          employeeId: currentSession.employeeId,
          employeeName: currentSession.employeeName,
          employeePin: currentPin,
          actionType: currentSession.actionType,
          geofenceRequired: currentSession.geofenceRequired,
          photoPreviewUrl: previewUrl,
        });
        setPendingCapture(null);
        setSuccessData(data);
        setStep('success');
      } catch (error) {
        console.error('Kiosk punch failed:', error);
        showError(
          error instanceof Error
            ? error.message
            : 'Could not save the record. Please try again.',
        );
        // Stay on confirm so they can retry or cancel — never show success.
        setStep('confirm');
      } finally {
        setProcessing(false);
      }
    })();
  };

  const handleConfirmCancel = () => {
    if (processing) return;
    clearPendingCapture();
    setStep('camera');
  };

  const showLogo = step !== 'success' && step !== 'saving';

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
            variant="horizontal"
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
                variant="horizontal"
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

            {step === 'confirm' && session && pendingCapture && (
              <KioskConfirmPunch
                actionType={session.actionType}
                employeeName={session.employeeName}
                warehouseLabel={warehouseLabel}
                photoPreviewUrl={pendingCapture.previewUrl}
                submitting={processing}
                onAccept={handleConfirmAccept}
                onCancel={handleConfirmCancel}
              />
            )}

            {step === 'saving' && session && (
              <div className="flex w-full max-w-md flex-col items-center gap-4 px-2 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-lg font-semibold text-white">
                  Checking location and saving…
                </p>
                <p className="text-sm text-zinc-400">
                  Stay at the site until this finishes. Do not leave the kiosk.
                </p>
              </div>
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
