import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export async function uploadEmployeeAvatar(
  employeeCode: string,
  file: File,
): Promise<string> {
  const optimized = await optimizeImageForUpload(file, 'avatar');
  const safeCode = employeeCode.trim().replace(/[^\w-]/g, '_');
  const path = `avatars/${safeCode}.webp`;

  return uploadImageToStorage(path, optimized);
}
