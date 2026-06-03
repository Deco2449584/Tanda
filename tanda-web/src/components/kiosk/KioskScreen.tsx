'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { KioskCamera } from '@/components/kiosk/KioskCamera';
import { KioskMasterPinModal } from '@/components/kiosk/KioskMasterPinModal';
import { KioskPinPad } from '@/components/kiosk/KioskPinPad';
import {
  KioskSuccessModal,
  type KioskSuccessData,
} from '@/components/kiosk/KioskSuccessModal';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { COLLECTIONS } from '@/lib/constants';
import { db, storage } from '@/lib/firebase';
import { resolveKioskAction } from '@/lib/kiosk/resolve-kiosk-action';

type KioskStep = 'pin' | 'camera' | 'success';

const SUCCESS_AUTO_RESET_MS = 4000;

interface KioskSession {
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  actionType: 'check_in' | 'check_out';
}

function createToast(
  text: string,
  variant: ToastMessage['variant'],
): ToastMessage {
  return { id: crypto.randomUUID(), text, variant };
}

interface KioskScreenProps {
  onLockDevice?: () => void;
}

export function KioskScreen({ onLockDevice }: KioskScreenProps) {
  const [step, setStep] = useState<KioskStep>('pin');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState<KioskSession | null>(null);
  const [successData, setSuccessData] = useState<KioskSuccessData | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [lockModalOpen, setLockModalOpen] = useState(false);

  const resetToPin = useCallback(() => {
    setStep('pin');
    setPin('');
    setSession(null);
    setSuccessData(null);
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
    if (!db) {
      setToast(createToast('Firebase is not available.', 'error'));
      return;
    }

    if (!pin.trim()) {
      setToast(createToast('Please enter your PIN.', 'error'));
      return;
    }

    setLoading(true);

    try {
      const cleanPin = pin.trim();
      const employeesQuery = query(
        collection(db, COLLECTIONS.EMPLOYEES),
        where('employeeId', '==', cleanPin),
        limit(1),
      );
      const snapshot = await getDocs(employeesQuery);

      if (snapshot.empty) {
        setToast(createToast('Invalid or unknown employee PIN.', 'error'));
        return;
      }

      const employeeDoc = snapshot.docs[0];
      const data = employeeDoc.data() as {
        employeeId?: string;
        name?: string;
        email?: string;
        active?: boolean;
        lastAction?: string;
        lastTimestampServer?: Timestamp;
      };

      if (data.active === false) {
        setToast(
          createToast(
            'This employee is inactive. Contact your administrator.',
            'error',
          ),
        );
        return;
      }

      const actionType = resolveKioskAction(
        data.lastAction,
        data.lastTimestampServer,
      );

      setSession({
        employeeDocId: employeeDoc.id,
        employeeId: data.employeeId ?? cleanPin,
        employeeName: data.name ?? '',
        employeeEmail: data.email ?? '',
        actionType,
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
    if (!db || !storage || !session) {
      setToast(createToast('Firebase is not available.', 'error'));
      return;
    }

    setProcessing(true);
    const recordedAt = new Date();

    try {
      const year = String(recordedAt.getFullYear());
      const month = String(recordedAt.getMonth() + 1).padStart(2, '0');
      const fileName = `${Date.now()}-${session.actionType}.jpg`;
      const photoPath = `attendance/${session.employeeId}/${year}/${month}/${fileName}`;

      const storageRef = ref(storage, photoPath);
      await uploadBytes(storageRef, imageBlob, { contentType: 'image/jpeg' });
      const photoUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, COLLECTIONS.ATTENDANCE_RECORDS), {
        employeeId: session.employeeId,
        employeeNameSnapshot: session.employeeName,
        employeeEmailSnapshot: session.employeeEmail,
        type: session.actionType,
        timestampServer: serverTimestamp(),
        source: 'web-kiosk',
        photoCaptured: true,
        photoPath,
        photoUrl,
      });

      await updateDoc(doc(db, COLLECTIONS.EMPLOYEES, session.employeeDocId), {
        lastAction: session.actionType,
        lastTimestampServer: serverTimestamp(),
      });

      setSuccessData({
        employeeName: session.employeeName,
        actionType: session.actionType,
        recordedAt,
        photoPreviewUrl: previewDataUrl,
      });
      setStep('success');
    } catch (error) {
      console.error('Kiosk capture save failed:', error);
      const message =
        error instanceof Error && error.message.includes('permission')
          ? 'Permission denied. Check Firestore rules for web-kiosk.'
          : 'Could not save attendance. Please try again.';
      setToast(createToast(message, 'error'));
    } finally {
      setProcessing(false);
    }
  };

  const showLogo = step !== 'success';

  return (
    <div className="relative flex min-h-[100dvh] max-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-3 py-2 md:px-4 md:py-6">
      <div
        className="pointer-events-none absolute -left-10 -top-20 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-12 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl"
        aria-hidden
      />

      {showLogo && (
        <Image
          src="/logo.svg"
          alt="Continental Cargo"
          width={280}
          height={100}
          priority
          className="mb-2 h-10 w-auto shrink-0 brightness-0 invert drop-shadow-md md:mb-6 md:h-16"
        />
      )}

      <div className="flex min-h-0 w-full max-w-[640px] flex-1 flex-col items-center justify-center">
      {step === 'pin' && (
        <KioskPinPad
          pin={pin}
          loading={loading}
          onDigit={handleDigit}
          onBackspace={() => setPin((prev) => prev.slice(0, -1))}
          onClear={() => setPin('')}
          onSubmit={() => void handleValidatePin()}
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

      {step === 'pin' && onLockDevice && (
        <button
          type="button"
          onClick={() => setLockModalOpen(true)}
          className="fixed bottom-4 left-4 z-40 rounded-full p-2 text-zinc-400 opacity-20 transition hover:bg-zinc-800/50 hover:text-blue-400 hover:opacity-100"
          aria-label="Lock kiosk terminal"
        >
          <Lock className="h-5 w-5" />
        </button>
      )}

      <KioskMasterPinModal
        open={lockModalOpen}
        title="Lock terminal"
        description="Enter master admin PIN to de-authorize this device."
        submitLabel="Lock device"
        onClose={() => setLockModalOpen(false)}
        onSuccess={() => {
          setLockModalOpen(false);
          onLockDevice?.();
        }}
        onError={(message) => setToast(createToast(message, 'error'))}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
