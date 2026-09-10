'use client';

import { useEffect, useState } from 'react';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import {
  getProfileUploadState,
  subscribeProfileUpload,
} from '@/lib/employees/background-profile-upload';

export function ProfileUploadStatusToaster() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    return subscribeProfileUpload((state) => {
      if (state.phase === 'idle') return;

      setToast({
        id: `profile-upload-${state.phase}-${Date.now()}`,
        text: state.message,
        variant:
          state.phase === 'error'
            ? 'error'
            : state.phase === 'done'
              ? 'success'
              : 'info',
      });
    });
  }, []);

  useEffect(() => {
    const current = getProfileUploadState();
    if (current.phase === 'uploading') {
      setToast({
        id: 'profile-upload-resume',
        text: current.message,
        variant: 'info',
      });
    }
  }, []);

  return (
    <Toast
      toast={toast}
      onDismiss={() => setToast(null)}
      durationMs={toast?.variant === 'info' ? 10_000 : 5500}
    />
  );
}
