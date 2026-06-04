import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import {
  STORAGE_CACHE_CONTROL,
  STORAGE_CONTENT_TYPE_WEBP,
} from '@/lib/images/constants';

export async function uploadImageToStorage(
  path: string,
  data: Blob | File,
  contentType: string = STORAGE_CONTENT_TYPE_WEBP,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, data, {
    contentType,
    cacheControl: STORAGE_CACHE_CONTROL,
  });

  return getDownloadURL(storageRef);
}
