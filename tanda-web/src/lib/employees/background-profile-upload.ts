import type { CustomFieldDraft } from '@/components/employees/EmployeeCustomFieldsForm';
import { buildCustomFieldValuePayloads } from '@/components/employees/EmployeeCustomFieldsForm';
import { saveEmployeeCustomFieldValuesRequest } from '@/lib/employees/employee-custom-fields-api';
import {
  startEmployeeProfileUploadRequest,
  submitEmployeeProfileRequest,
  type EmployeeProfilePersonalPayload,
} from '@/lib/employees/employee-profile-api';
import { uploadEmployeeAvatar } from '@/lib/employees/upload-avatar';
import { uploadEmployeeDocument } from '@/lib/employees/upload-document';
import type { EmployeeCustomField } from '@/lib/types/employee-custom-field';

export type ProfileUploadPhase = 'idle' | 'uploading' | 'done' | 'error';

export interface ProfileUploadState {
  phase: ProfileUploadPhase;
  message: string;
}

type Listener = (state: ProfileUploadState) => void;

let currentState: ProfileUploadState = {
  phase: 'idle',
  message: '',
};
let activeJob: Promise<void> | null = null;
const listeners = new Set<Listener>();

function publish(state: ProfileUploadState) {
  currentState = state;
  listeners.forEach((listener) => listener(state));
}

export function getProfileUploadState(): ProfileUploadState {
  return currentState;
}

export function subscribeProfileUpload(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

export interface BackgroundProfileUploadJob {
  employeeCode: string;
  personal: EmployeeProfilePersonalPayload;
  existingPhotoUrl?: string;
  existingPassportUrl?: string;
  existingPassportFileName?: string;
  existingVisaUrl?: string;
  existingVisaFileName?: string;
  photoFile: File | null;
  passportFile: File | null;
  visaFile: File | null;
  customFields: EmployeeCustomField[];
  customDrafts: Record<string, CustomFieldDraft>;
}

/**
 * Saves personal details immediately (Uploading), then uploads documents
 * in the background and finalizes to Pending.
 *
 * Resolves as soon as the profile is marked Uploading so the UI can navigate
 * away without waiting for file uploads (or a previous in-flight job).
 */
export async function beginBackgroundProfileUpload(
  job: BackgroundProfileUploadJob,
): Promise<void> {
  await startEmployeeProfileUploadRequest(job.personal);

  const previousJob = activeJob;

  publish({
    phase: 'uploading',
    message: 'Uploading your documents in the background…',
  });

  let run!: Promise<void>;
  run = (async () => {
    if (previousJob) {
      try {
        await previousJob;
      } catch {
        // Previous job failed; continue with this one.
      }
    }

    try {
      const customTask =
        job.customFields.length > 0
          ? (async () => {
              const values = await buildCustomFieldValuePayloads({
                fields: job.customFields,
                drafts: job.customDrafts,
                employeeCode: job.employeeCode,
              });
              if (values.length > 0) {
                await saveEmployeeCustomFieldValuesRequest({ values });
              }
            })()
          : Promise.resolve();

      const photoTask = job.photoFile
        ? uploadEmployeeAvatar(job.employeeCode, job.photoFile)
        : Promise.resolve(job.existingPhotoUrl?.trim() ?? '');

      const passportTask = job.passportFile
        ? uploadEmployeeDocument(job.employeeCode, job.passportFile, 'passport')
        : Promise.resolve({
            url: job.existingPassportUrl?.trim() ?? '',
            fileName: job.existingPassportFileName,
          });

      const visaTask = job.visaFile
        ? uploadEmployeeDocument(job.employeeCode, job.visaFile, 'visa')
        : Promise.resolve({
            url: job.existingVisaUrl?.trim() ?? '',
            fileName: job.existingVisaFileName,
          });

      const [photoUrl, passportUpload, visaUpload] = await Promise.all([
        photoTask,
        passportTask,
        visaTask,
        customTask,
      ]).then(([photo, passport, visa]) => [photo, passport, visa] as const);

      if (!photoUrl.trim() && !passportUpload.url.trim() && !visaUpload.url.trim()) {
        await submitEmployeeProfileRequest({
          ...job.personal,
        });
      } else {
        await submitEmployeeProfileRequest({
          ...job.personal,
          ...(photoUrl.trim() ? { photoUrl } : {}),
          ...(passportUpload.url.trim()
            ? {
                passportUrl: passportUpload.url,
                passportFileName: passportUpload.fileName,
              }
            : {}),
          ...(visaUpload.url.trim()
            ? {
                visaUrl: visaUpload.url,
                visaFileName: visaUpload.fileName,
              }
            : {}),
        });
      }

      publish({
        phase: 'done',
        message: 'Profile submitted. Pending admin review.',
      });
    } catch (error) {
      publish({
        phase: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Document upload failed. Open My profile to try again.',
      });
    } finally {
      if (activeJob === run) {
        activeJob = null;
      }
    }
  })();

  activeJob = run;
}
