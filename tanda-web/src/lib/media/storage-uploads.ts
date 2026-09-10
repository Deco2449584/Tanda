import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { HelpResourceKind } from '@/lib/types/help-tutorial';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_COURSE_EVIDENCE_BYTES = 10 * 1024 * 1024;

export function detectHelpResourceKind(file: File): HelpResourceKind {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/.test(name)) {
    return 'video';
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
    return 'image';
  }
  return 'document';
}

function extensionForUpload(file: File, kind: HelpResourceKind): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;

  if (kind === 'video') {
    if (file.type.includes('webm')) return 'webm';
    if (file.type.includes('quicktime')) return 'mov';
    return 'mp4';
  }
  if (kind === 'pdf') return 'pdf';
  if (kind === 'image') {
    if (file.type.includes('png')) return 'png';
    if (file.type.includes('webp')) return 'webp';
    if (file.type.includes('gif')) return 'gif';
    return 'jpg';
  }
  return 'bin';
}

function assertFileSize(file: File, kind: HelpResourceKind): void {
  if (kind === 'video') {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('Video must be under 100 MB.');
    }
    return;
  }
  if (kind === 'image') {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Image must be under 10 MB.');
    }
    return;
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Document must be under 25 MB.');
  }
}

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

export async function uploadTutorialResource(
  tutorialId: string,
  file: File,
  options?: { kind?: HelpResourceKind; fileId?: string },
): Promise<{
  kind: HelpResourceKind;
  url: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const kind = options?.kind ?? detectHelpResourceKind(file);
  assertFileSize(file, kind);

  const contentType =
    file.type ||
    (kind === 'pdf'
      ? 'application/pdf'
      : kind === 'video'
        ? 'video/mp4'
        : kind === 'image'
          ? 'image/jpeg'
          : 'application/octet-stream');

  const extension = extensionForUpload(file, kind);
  const fileId = options?.fileId ?? crypto.randomUUID();
  const fileName =
    kind === 'video' && !options?.fileId
      ? `video.${extension}`
      : `${fileId}.${extension}`;
  const path = `help_tutorials/${tutorialId}/${fileName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType,
    cacheControl:
      kind === 'video'
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=3600',
  });

  const url = await getDownloadURL(storageRef);

  return {
    kind,
    url,
    path,
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  };
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

export async function uploadCourseEvidence(
  employeeId: string,
  enrollmentId: string,
  file: File,
): Promise<{ evidenceUrl: string; evidencePath: string; evidenceFileName: string }> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  if (file.size > MAX_COURSE_EVIDENCE_BYTES) {
    throw new Error('Evidence must be under 10 MB.');
  }

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isImage && !isPdf) {
    throw new Error('Upload a screenshot (image) or PDF certificate.');
  }

  const safeCode = employeeId.trim().replace(/[^\w-]/g, '_');
  const safeEnrollment = enrollmentId.trim().replace(/[^\w-]/g, '_');
  const extension = isPdf
    ? 'pdf'
    : file.type.includes('png')
      ? 'png'
      : file.type.includes('webp')
        ? 'webp'
        : 'jpg';
  const evidencePath = `course_evidence/${safeCode}/${safeEnrollment}/${Date.now()}.${extension}`;
  const storageRef = ref(storage, evidencePath);
  const contentType = isPdf ? 'application/pdf' : file.type || 'image/jpeg';

  await uploadBytes(storageRef, file, {
    contentType,
    cacheControl: 'private, max-age=3600',
  });

  const evidenceUrl = await getDownloadURL(storageRef);
  return {
    evidenceUrl,
    evidencePath,
    evidenceFileName: file.name,
  };
}
