import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { storage } from '@/lib/firebase';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export type EmployeeDocumentKind = 'passport' | 'visa';

export function validateEmployeeDocumentFile(file: File): string | null {
  const allowed =
    file.type.startsWith('image/') || file.type === 'application/pdf';

  if (!allowed) {
    return 'Please choose a JPEG, PNG, WebP image, or PDF file.';
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'File is too large. Choose a file under 10 MB.';
  }

  return null;
}

export function validateEmployeeCustomImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please choose a JPEG, PNG, or WebP image.';
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return 'File is too large. Choose a file under 10 MB.';
  }

  return null;
}

function safeEmployeeCode(employeeCode: string): string {
  return employeeCode.trim().replace(/[^\w-]/g, '_');
}

function safeFieldId(fieldId: string): string {
  return fieldId.trim().replace(/[^\w-]/g, '_') || 'field';
}

function fileExtension(file: File): string {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadEmployeeDocument(
  employeeCode: string,
  file: File,
  kind: EmployeeDocumentKind,
): Promise<{ url: string; fileName: string; storagePath: string }> {
  const error = validateEmployeeDocumentFile(file);
  if (error) throw new Error(error);

  const safeCode = safeEmployeeCode(employeeCode);
  const stamp = Date.now();

  if (file.type.startsWith('image/')) {
    const optimized = await optimizeImageForUpload(file, 'attendance');
    const path = `employee_documents/${safeCode}/${kind}/${stamp}.webp`;
    const url = await uploadImageToStorage(path, optimized);
    return { url, fileName: file.name, storagePath: path };
  }

  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const path = `employee_documents/${safeCode}/${kind}/${stamp}.${fileExtension(file)}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'private, max-age=3600',
  });

  const url = await getDownloadURL(storageRef);
  return { url, fileName: file.name, storagePath: path };
}

export async function uploadEmployeeCustomFieldFile(
  employeeCode: string,
  fieldId: string,
  file: File,
  kind: 'file' | 'image',
): Promise<{ url: string; fileName: string; storagePath: string; mimeType: string }> {
  const error =
    kind === 'image'
      ? validateEmployeeCustomImageFile(file)
      : validateEmployeeDocumentFile(file);
  if (error) throw new Error(error);

  const safeCode = safeEmployeeCode(employeeCode);
  const safeField = safeFieldId(fieldId);
  const stamp = Date.now();

  if (file.type.startsWith('image/')) {
    const optimized = await optimizeImageForUpload(file, 'attendance');
    const path = `employee_documents/${safeCode}/custom/${safeField}/${stamp}.webp`;
    const url = await uploadImageToStorage(path, optimized);
    return {
      url,
      fileName: file.name,
      storagePath: path,
      mimeType: 'image/webp',
    };
  }

  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const path = `employee_documents/${safeCode}/custom/${safeField}/${stamp}.${fileExtension(file)}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'private, max-age=3600',
  });

  const url = await getDownloadURL(storageRef);
  return {
    url,
    fileName: file.name,
    storagePath: path,
    mimeType: file.type,
  };
}
