import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEY = '@continentalinspect/inspection_form_draft';

export type InspectionFormDraft<T> = {
  form: T;
  weightText: string;
  boxCountText: string;
  temperatureText: string;
  showDriverFields: boolean;
};

export async function loadInspectionFormDraft<T>(): Promise<InspectionFormDraft<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InspectionFormDraft<T>;
    if (!parsed?.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveInspectionFormDraft<T>(draft: InspectionFormDraft<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // The in-memory form is still on screen. The next change retries the write.
  }
}

export async function clearInspectionFormDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // Leaving a stale draft is safer than blocking save.
  }
}
