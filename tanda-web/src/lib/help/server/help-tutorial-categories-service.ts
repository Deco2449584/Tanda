import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  categoryNamesMatch,
  normalizeHelpTutorialCategoryName,
  resolveHelpTutorialCategories,
  validateHelpTutorialCategoryName,
} from '@/lib/help/help-tutorial-categories';
import { listAllHelpTutorials } from '@/lib/help/server/help-tutorials-service';

const SETTINGS_DOC_ID = 'general';

async function readConfiguredCategories(): Promise<string[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc(SETTINGS_DOC_ID)
    .get();

  if (!snapshot.exists) return [];

  const raw = snapshot.data()?.helpTutorialCategories;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeHelpTutorialCategoryName(item))
    .filter(Boolean);
}

export async function listHelpTutorialCategories(): Promise<string[]> {
  const [configured, tutorials] = await Promise.all([
    readConfiguredCategories(),
    listAllHelpTutorials(),
  ]);

  return resolveHelpTutorialCategories(
    configured,
    tutorials.map((tutorial) => tutorial.category),
  );
}

export async function addHelpTutorialCategory(name: string): Promise<string[]> {
  const normalized = normalizeHelpTutorialCategoryName(name);
  const validationError = validateHelpTutorialCategoryName(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const [configured, tutorials] = await Promise.all([
    readConfiguredCategories(),
    listAllHelpTutorials(),
  ]);

  const existing = resolveHelpTutorialCategories(
    configured,
    tutorials.map((tutorial) => tutorial.category),
  );

  if (existing.some((category) => categoryNamesMatch(category, normalized))) {
    throw new Error('This category already exists.');
  }

  const nextConfigured = [...configured, normalized];

  await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc(SETTINGS_DOC_ID)
    .set({ helpTutorialCategories: nextConfigured }, { merge: true });

  return resolveHelpTutorialCategories(
    nextConfigured,
    tutorials.map((tutorial) => tutorial.category),
  );
}
