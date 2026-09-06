import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CargoInspection } from '@/types';

const CACHE_PREFIX = '@continentalinspect/inspections_cache:';

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

export async function loadInspectionCache(userId: string): Promise<CargoInspection[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CargoInspection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveInspectionCache(
  userId: string,
  inspections: readonly CargoInspection[],
): Promise<void> {
  try {
    const syncedOnly = inspections
      .filter((item) => item.syncStatus !== 'pending')
      .map((item) => ({ ...item, syncStatus: 'synced' as const }));
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(syncedOnly));
  } catch {
    // Cache write failures should not block the UI.
  }
}
