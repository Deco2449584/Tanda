import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export async function uploadLocationPhoto(
  locationId: string,
  file: File,
): Promise<string> {
  const optimized = await optimizeImageForUpload(file, 'avatar');
  const safeId = locationId.trim().replace(/[^\w-]/g, '_');
  const path = `location_photos/${safeId}.webp`;

  return uploadImageToStorage(path, optimized);
}
