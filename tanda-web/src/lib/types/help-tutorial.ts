import type { Timestamp } from 'firebase/firestore';

export const DEFAULT_HELP_TUTORIAL_CATEGORIES = [
  'Getting started',
  'Attendance & kiosk',
  'Schedule',
  'Leave requests',
  'Policies & guides',
  'Admin tools',
  'Mobile app',
] as const;

/** @deprecated Use DEFAULT_HELP_TUTORIAL_CATEGORIES */
export const HELP_TUTORIAL_CATEGORIES = DEFAULT_HELP_TUTORIAL_CATEGORIES;

export type HelpTutorialCategory = string;

export const HELP_TUTORIAL_AUDIENCES = [
  'all',
  'userRole',
  'department',
  'location',
] as const;
export type HelpTutorialAudience = (typeof HELP_TUTORIAL_AUDIENCES)[number];

export const HELP_TUTORIAL_USER_ROLES = ['empleado', 'admin', 'master', 'kiosk'] as const;
export type HelpTutorialUserRole = (typeof HELP_TUTORIAL_USER_ROLES)[number];

export const HELP_RESOURCE_KINDS = [
  'video',
  'pdf',
  'document',
  'image',
  'link',
] as const;
export type HelpResourceKind = (typeof HELP_RESOURCE_KINDS)[number];

export interface HelpTutorialAttachment {
  id: string;
  kind: HelpResourceKind;
  /** Download URL or external https URL for links. */
  url: string;
  /** Firebase Storage path — omitted for external links. */
  path?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface HelpTutorialFirestore {
  title: string;
  description: string;
  category: HelpTutorialCategory;
  audience: HelpTutorialAudience;
  audienceValue?: string;
  audienceRoles?: HelpTutorialUserRole[];
  /** Primary resource type for cards and icons. */
  kind: HelpResourceKind;
  /** Legacy / primary video fields (kept for older tutorials). */
  videoUrl?: string;
  videoPath?: string;
  /** Primary non-video file (PDF, doc, image). */
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  /** External guide URL when kind is link. */
  externalUrl?: string;
  /** Extra files attached to the same guide. */
  attachments?: HelpTutorialAttachment[];
  thumbnailUrl?: string;
  durationSeconds?: number;
  sortOrder: number;
  published: boolean;
  active: boolean;
  createdByEmail?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface HelpTutorial extends HelpTutorialFirestore {
  id: string;
}

export interface CreateHelpTutorialInput {
  title: string;
  description: string;
  category: HelpTutorialCategory;
  audience: HelpTutorialAudience;
  audienceValue?: string;
  audienceRoles?: HelpTutorialUserRole[];
  kind: HelpResourceKind;
  videoUrl?: string;
  videoPath?: string;
  fileUrl?: string;
  filePath?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  externalUrl?: string;
  attachments?: HelpTutorialAttachment[];
  thumbnailUrl?: string;
  durationSeconds?: number;
  sortOrder?: number;
  published?: boolean;
}

export interface UpdateHelpTutorialInput {
  title?: string;
  description?: string;
  category?: HelpTutorialCategory;
  audience?: HelpTutorialAudience;
  audienceValue?: string | null;
  audienceRoles?: HelpTutorialUserRole[] | null;
  kind?: HelpResourceKind;
  videoUrl?: string;
  videoPath?: string;
  fileUrl?: string | null;
  filePath?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  externalUrl?: string | null;
  attachments?: HelpTutorialAttachment[] | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  sortOrder?: number;
  published?: boolean;
  active?: boolean;
}

export const HELP_RESOURCE_KIND_LABELS: Record<HelpResourceKind, string> = {
  video: 'Video',
  pdf: 'PDF',
  document: 'Document',
  image: 'Image',
  link: 'External link',
};
