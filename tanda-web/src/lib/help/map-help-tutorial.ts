import {
  HELP_RESOURCE_KINDS,
  HELP_TUTORIAL_AUDIENCES,
  HELP_TUTORIAL_USER_ROLES,
  type HelpResourceKind,
  type HelpTutorial,
  type HelpTutorialAttachment,
  type HelpTutorialFirestore,
} from '@/lib/types/help-tutorial';
import { parseStoredHelpTutorialCategory } from '@/lib/help/help-tutorial-categories';

function parseCategory(value: unknown): HelpTutorial['category'] {
  return parseStoredHelpTutorialCategory(value);
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

function parseKind(value: unknown): HelpResourceKind | undefined {
  if (
    typeof value === 'string' &&
    (HELP_RESOURCE_KINDS as readonly string[]).includes(value)
  ) {
    return value as HelpResourceKind;
  }
  return undefined;
}

function parseAttachment(value: unknown): HelpTutorialAttachment | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const url = typeof record.url === 'string' ? record.url.trim() : '';
  const kind = parseKind(record.kind);
  if (!id || !url || !kind) return null;

  return {
    id,
    kind,
    url,
    path: typeof record.path === 'string' ? record.path : undefined,
    fileName: typeof record.fileName === 'string' ? record.fileName : undefined,
    contentType:
      typeof record.contentType === 'string' ? record.contentType : undefined,
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : undefined,
  };
}

function parseAttachments(value: unknown): HelpTutorialAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(parseAttachment)
    .filter((item): item is HelpTutorialAttachment => Boolean(item));
}

function inferKind(record: Partial<HelpTutorialFirestore>): HelpResourceKind {
  const explicit = parseKind(record.kind);
  if (explicit) return explicit;
  if (record.externalUrl) return 'link';
  if (record.videoUrl) return 'video';
  const contentType = record.contentType?.toLowerCase() ?? '';
  if (contentType.includes('pdf') || record.fileName?.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  if (contentType.startsWith('image/')) return 'image';
  if (record.fileUrl) return 'document';
  return 'video';
}

/** Primary playable / openable URL for a tutorial. */
export function resolveHelpTutorialPrimaryUrl(tutorial: {
  kind?: HelpResourceKind;
  videoUrl?: string;
  fileUrl?: string;
  externalUrl?: string;
  attachments?: HelpTutorialAttachment[];
}): string {
  if (tutorial.kind === 'link' && tutorial.externalUrl) return tutorial.externalUrl;
  if (tutorial.kind === 'video' && tutorial.videoUrl) return tutorial.videoUrl;
  if (tutorial.fileUrl) return tutorial.fileUrl;
  if (tutorial.videoUrl) return tutorial.videoUrl;
  if (tutorial.externalUrl) return tutorial.externalUrl;
  return tutorial.attachments?.[0]?.url ?? '';
}

export function mapHelpTutorialDoc(
  id: string,
  data: Record<string, unknown>,
): HelpTutorial {
  const record = data as Partial<HelpTutorialFirestore>;
  const kind = inferKind(record);
  const attachments = parseAttachments(record.attachments);

  const videoUrl = typeof record.videoUrl === 'string' ? record.videoUrl : '';
  const videoPath = typeof record.videoPath === 'string' ? record.videoPath : '';
  const fileUrl = typeof record.fileUrl === 'string' ? record.fileUrl : undefined;
  const filePath = typeof record.filePath === 'string' ? record.filePath : undefined;
  const externalUrl =
    typeof record.externalUrl === 'string' ? record.externalUrl : undefined;

  // Backfill attachments for legacy video-only docs so the UI can treat them uniformly.
  const resolvedAttachments =
    attachments.length > 0
      ? attachments
      : videoUrl
        ? [
            {
              id: 'primary-video',
              kind: 'video' as const,
              url: videoUrl,
              path: videoPath || undefined,
              contentType: 'video/mp4',
            },
          ]
        : fileUrl
          ? [
              {
                id: 'primary-file',
                kind,
                url: fileUrl,
                path: filePath,
                fileName:
                  typeof record.fileName === 'string' ? record.fileName : undefined,
                contentType:
                  typeof record.contentType === 'string'
                    ? record.contentType
                    : undefined,
                sizeBytes:
                  typeof record.sizeBytes === 'number' ? record.sizeBytes : undefined,
              },
            ]
          : externalUrl
            ? [
                {
                  id: 'primary-link',
                  kind: 'link' as const,
                  url: externalUrl,
                },
              ]
            : [];

  return {
    id,
    title: typeof record.title === 'string' ? record.title : '',
    description: typeof record.description === 'string' ? record.description : '',
    category: parseCategory(record.category),
    audience: parseAudience(record.audience),
    audienceValue:
      typeof record.audienceValue === 'string' ? record.audienceValue : undefined,
    audienceRoles: parseRoles(record.audienceRoles),
    kind,
    videoUrl,
    videoPath,
    fileUrl,
    filePath,
    fileName: typeof record.fileName === 'string' ? record.fileName : undefined,
    contentType:
      typeof record.contentType === 'string' ? record.contentType : undefined,
    sizeBytes: typeof record.sizeBytes === 'number' ? record.sizeBytes : undefined,
    externalUrl,
    attachments: resolvedAttachments,
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
