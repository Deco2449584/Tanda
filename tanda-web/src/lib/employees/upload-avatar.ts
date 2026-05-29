import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export async function uploadEmployeeAvatar(
  employeeCode: string,
  file: File,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage no está disponible.');
  }

  const safeCode = employeeCode.trim().replace(/[^\w-]/g, '_');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `avatars/${safeCode}.${extension}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}
