import { DEFAULT_HELP_TUTORIAL_CATEGORIES } from '@/lib/types/help-tutorial';

export const HELP_TUTORIAL_CATEGORY_MAX_LENGTH = 60;

export function normalizeHelpTutorialCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validateHelpTutorialCategoryName(name: string): string | null {
  const normalized = normalizeHelpTutorialCategoryName(name);
  if (normalized.length < 2) {
    return 'Category must be at least 2 characters.';
  }
  if (normalized.length > HELP_TUTORIAL_CATEGORY_MAX_LENGTH) {
    return `Category must be ${HELP_TUTORIAL_CATEGORY_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

export function categoryNamesMatch(a: string, b: string): boolean {
  return (
    normalizeHelpTutorialCategoryName(a).toLocaleLowerCase() ===
    normalizeHelpTutorialCategoryName(b).toLocaleLowerCase()
  );
}

export function resolveHelpTutorialCategories(
  configured: readonly string[] | undefined,
  inUse: readonly string[],
): string[] {
  const seen = new Map<string, string>();

  const add = (value: string) => {
    const normalized = normalizeHelpTutorialCategoryName(value);
    if (!normalized) return;
    const key = normalized.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalized);
    }
  };

  DEFAULT_HELP_TUTORIAL_CATEGORIES.forEach(add);
  (configured ?? []).forEach(add);
  inUse.forEach(add);

  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export function parseStoredHelpTutorialCategory(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_HELP_TUTORIAL_CATEGORIES[0];
  }

  const normalized = normalizeHelpTutorialCategoryName(value);
  if (!validateHelpTutorialCategoryName(normalized)) {
    return normalized;
  }

  return DEFAULT_HELP_TUTORIAL_CATEGORIES[0];
}
