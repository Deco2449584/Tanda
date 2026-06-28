import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function uploadTutorialVideo(
  tutorialId: string,
  file: File | Blob,
  contentType: string,
): Promise<{ videoUrl: string; videoPath: string }> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('Video must be under 100 MB.');
  }

  const extension = contentType.includes('webm')
    ? 'webm'
    : contentType.includes('quicktime')
      ? 'mov'
      : 'mp4';
  const videoPath = `help_tutorials/${tutorialId}/video.${extension}`;
  const storageRef = ref(storage, videoPath);

  await uploadBytes(storageRef, file, {
    contentType,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  const videoUrl = await getDownloadURL(storageRef);
  return { videoUrl, videoPath };
}

export async function uploadIssueAttachment(
  employeeId: string,
  reportId: string,
  file: Blob,
): Promise<{ attachmentUrl: string; attachmentPath: string }> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const safeCode = employeeId.trim().replace(/[^\w-]/g, '_');
  const attachmentPath = `issue_reports/${safeCode}/${reportId}/${Date.now()}.webp`;
  const storageRef = ref(storage, attachmentPath);

  await uploadBytes(storageRef, file, {
    contentType: 'image/webp',
    cacheControl: 'private, max-age=3600',
  });

  const attachmentUrl = await getDownloadURL(storageRef);
  return { attachmentUrl, attachmentPath };
}
