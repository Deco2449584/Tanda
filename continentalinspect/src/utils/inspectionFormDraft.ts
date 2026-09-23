import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@continentalinspect/inspection_form_draft';
const LEGACY_DRAFT_KEY = DRAFT_PREFIX;

export type InspectionFormDraft<T> = {
  form: T;
  weightText: string;
  boxCountText: string;
  temperatureText: string;
  showDriverFields: boolean;
};

function draftKey(userId: string): string {
  return `${DRAFT_PREFIX}:${userId}`;
}

export async function loadInspectionFormDraft<T>(
  userId: string,
): Promise<InspectionFormDraft<T> | null> {
  if (!userId) {
    return null;
  }

  try {
    const raw = await AsyncStorage.getItem(draftKey(userId));
    if (!raw) {
      await AsyncStorage.removeItem(LEGACY_DRAFT_KEY);
      return null;
    }
    const parsed = JSON.parse(raw) as InspectionFormDraft<T>;
    if (!parsed?.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveInspectionFormDraft<T>(
  userId: string,
  draft: InspectionFormDraft<T>,
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    await AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft));
    await AsyncStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    // The in-memory form is still on screen. The next change retries the write.
  }
}

export async function clearInspectionFormDraft(userId?: string): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.removeItem(draftKey(userId));
    }
    await AsyncStorage.removeItem(LEGACY_DRAFT_KEY);
  } catch {
    // Leaving a stale draft is safer than blocking save.
  }
}
