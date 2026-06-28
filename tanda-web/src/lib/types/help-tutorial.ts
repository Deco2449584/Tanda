import type { Timestamp } from 'firebase/firestore';

export const HELP_TUTORIAL_CATEGORIES = [
  'Getting started',
  'Attendance & kiosk',
  'Schedule',
  'Leave requests',
  'Admin tools',
  'Mobile app',
] as const;
export type HelpTutorialCategory = (typeof HELP_TUTORIAL_CATEGORIES)[number];

export const HELP_TUTORIAL_AUDIENCES = [
  'all',
  'userRole',
  'department',
  'location',
] as const;
export type HelpTutorialAudience = (typeof HELP_TUTORIAL_AUDIENCES)[number];

export const HELP_TUTORIAL_USER_ROLES = ['empleado', 'admin', 'master', 'kiosk'] as const;
export type HelpTutorialUserRole = (typeof HELP_TUTORIAL_USER_ROLES)[number];

export interface HelpTutorialFirestore {
  title: string;
  description: string;
  category: HelpTutorialCategory;
  audience: HelpTutorialAudience;
  audienceValue?: string;
  audienceRoles?: HelpTutorialUserRole[];
  videoUrl: string;
  videoPath: string;
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
  videoUrl: string;
  videoPath: string;
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
  videoUrl?: string;
  videoPath?: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  sortOrder?: number;
  published?: boolean;
  active?: boolean;
}
