import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EmployeeProfile } from '@/types/auth';

const CACHE_PREFIX = '@continentalinspect/employee_profile:';

function cacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

export async function loadCachedEmployeeProfile(
  userId: string,
): Promise<EmployeeProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as EmployeeProfile;
    if (!parsed?.docId || !parsed.email) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedEmployeeProfile(
  userId: string,
  profile: EmployeeProfile,
): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(profile));
  } catch {
    // Offline session still works from in-memory profile.
  }
}

export async function clearCachedEmployeeProfile(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId));
  } catch {
    // Sign-out should still proceed.
  }
}
