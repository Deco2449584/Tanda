import type { HelpTutorial, HelpTutorialFirestore } from '@/lib/types/help-tutorial';
import {
  HELP_TUTORIAL_AUDIENCES,
  HELP_TUTORIAL_CATEGORIES,
  HELP_TUTORIAL_USER_ROLES,
} from '@/lib/types/help-tutorial';

function parseCategory(value: unknown): HelpTutorial['category'] {
  if (
    typeof value === 'string' &&
    (HELP_TUTORIAL_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as HelpTutorial['category'];
  }
  return 'Getting started';
}

function parseAudience(value: unknown): HelpTutorial['audience'] {
  if (
    typeof value === 'string' &&
    (HELP_TUTORIAL_AUDIENCES as readonly string[]).includes(value)
  ) {
    return value as HelpTutorial['audience'];
  }
  return 'all';
}

function parseRoles(value: unknown): HelpTutorial['audienceRoles'] {
  if (!Array.isArray(value)) return undefined;
  return value.filter(
    (role): role is NonNullable<HelpTutorial['audienceRoles']>[number] =>
      typeof role === 'string' &&
      (HELP_TUTORIAL_USER_ROLES as readonly string[]).includes(role),
  );
}

export function mapHelpTutorialDoc(
  id: string,
  data: Record<string, unknown>,
): HelpTutorial {
  const record = data as Partial<HelpTutorialFirestore>;

  return {
    id,
    title: typeof record.title === 'string' ? record.title : '',
    description: typeof record.description === 'string' ? record.description : '',
    category: parseCategory(record.category),
    audience: parseAudience(record.audience),
    audienceValue:
      typeof record.audienceValue === 'string' ? record.audienceValue : undefined,
    audienceRoles: parseRoles(record.audienceRoles),
    videoUrl: typeof record.videoUrl === 'string' ? record.videoUrl : '',
    videoPath: typeof record.videoPath === 'string' ? record.videoPath : '',
    thumbnailUrl:
      typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : undefined,
    durationSeconds:
      typeof record.durationSeconds === 'number' ? record.durationSeconds : undefined,
    sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : 0,
    published: record.published === true,
    active: record.active !== false,
    createdByEmail:
      typeof record.createdByEmail === 'string' ? record.createdByEmail : undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function serializeHelpTutorial(tutorial: HelpTutorial) {
  return {
    ...tutorial,
    createdAt: tutorial.createdAt?.toDate?.()?.toISOString() ?? null,
    updatedAt: tutorial.updatedAt?.toDate?.()?.toISOString() ?? null,
  };
}
