import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export async function uploadEmployeeAvatar(
  employeeCode: string,
  file: File,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const optimized = await optimizeImageForUpload(file);
  const safeCode = employeeCode.trim().replace(/[^\w-]/g, '_');
  const path = `avatars/${safeCode}.webp`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, optimized, {
    contentType: 'image/webp',
  });

  return getDownloadURL(storageRef);
}
