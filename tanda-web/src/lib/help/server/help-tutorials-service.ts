import { FieldValue } from 'firebase-admin/firestore';
import { employeeCanViewTutorial } from '@/lib/help/match-tutorial-audience';
import {
  mapHelpTutorialDoc,
  serializeHelpTutorial,
} from '@/lib/help/map-help-tutorial';
import type { EmployeeContext } from '@/lib/auth/load-employee-context';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  CreateHelpTutorialInput,
  HelpTutorial,
  UpdateHelpTutorialInput,
} from '@/lib/types/help-tutorial';
import {
  HELP_TUTORIAL_AUDIENCES,
  HELP_TUTORIAL_CATEGORIES,
} from '@/lib/types/help-tutorial';

function parseCategory(value: string): CreateHelpTutorialInput['category'] {
  const trimmed = value.trim();
  if ((HELP_TUTORIAL_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CreateHelpTutorialInput['category'];
  }
  return 'Getting started';
}

function parseAudience(value: string): CreateHelpTutorialInput['audience'] {
  const trimmed = value.trim();
  if ((HELP_TUTORIAL_AUDIENCES as readonly string[]).includes(trimmed)) {
    return trimmed as CreateHelpTutorialInput['audience'];
  }
  return 'all';
}

export async function listHelpTutorialsForViewer(
  viewer: EmployeeContext,
): Promise<HelpTutorial[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.HELP_TUTORIALS)
    .get();

  return snapshot.docs
    .map((document) => mapHelpTutorialDoc(document.id, document.data()))
    .filter((tutorial) =>
      employeeCanViewTutorial(tutorial, {
        role: viewer.role,
        department: viewer.department,
        locationId: viewer.locationId,
      }),
    )
    .sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.title.localeCompare(b.title);
    });
}

export async function listAllHelpTutorials(): Promise<HelpTutorial[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.HELP_TUTORIALS)
    .get();

  return snapshot.docs
    .map((document) => mapHelpTutorialDoc(document.id, document.data()))
    .sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.title.localeCompare(b.title);
    });
}

export async function createHelpTutorial(input: {
  payload: CreateHelpTutorialInput;
  createdByEmail: string;
}): Promise<HelpTutorial> {
  const title = input.payload.title.trim();
  const description = input.payload.description.trim();
  const videoUrl = input.payload.videoUrl.trim();
  const videoPath = input.payload.videoPath.trim();

  if (!title) throw new Error('Title is required.');
  if (!videoUrl || !videoPath) throw new Error('Video is required.');

  if (input.payload.audience === 'department' || input.payload.audience === 'location') {
    if (!input.payload.audienceValue?.trim()) {
      throw new Error('Select a department or location for this audience.');
    }
  }

  if (input.payload.audience === 'userRole') {
    if (!input.payload.audienceRoles?.length) {
      throw new Error('Select at least one user role.');
    }
  }

  const ref = getAdminFirestore().collection(COLLECTIONS.HELP_TUTORIALS).doc();

  const payload: Record<string, unknown> = {
    title,
    description,
    category: parseCategory(input.payload.category),
    audience: parseAudience(input.payload.audience),
    videoUrl,
    videoPath,
    sortOrder: input.payload.sortOrder ?? 0,
    published: input.payload.published === true,
    active: true,
    createdByEmail: input.createdByEmail,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.payload.audienceValue?.trim()) {
    payload.audienceValue = input.payload.audienceValue.trim();
  }
  if (input.payload.audienceRoles?.length) {
    payload.audienceRoles = input.payload.audienceRoles;
  }
  if (input.payload.thumbnailUrl?.trim()) {
    payload.thumbnailUrl = input.payload.thumbnailUrl.trim();
  }
  if (typeof input.payload.durationSeconds === 'number') {
    payload.durationSeconds = input.payload.durationSeconds;
  }

  await ref.set(payload);

  const snapshot = await ref.get();
  return mapHelpTutorialDoc(snapshot.id, snapshot.data() ?? {});
}

export async function updateHelpTutorial(
  id: string,
  input: UpdateHelpTutorialInput,
): Promise<HelpTutorial> {
  const ref = getAdminFirestore().collection(COLLECTIONS.HELP_TUTORIALS).doc(id.trim());
  const existing = await ref.get();

  if (!existing.exists) {
    throw new Error('Tutorial not found.');
  }

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof input.title === 'string') update.title = input.title.trim();
  if (typeof input.description === 'string') {
    update.description = input.description.trim();
  }
  if (typeof input.category === 'string') {
    update.category = parseCategory(input.category);
  }
  if (typeof input.audience === 'string') {
    update.audience = parseAudience(input.audience);
  }
  if (input.audienceValue === null) {
    update.audienceValue = FieldValue.delete();
  } else if (typeof input.audienceValue === 'string') {
    update.audienceValue = input.audienceValue.trim();
  }
  if (input.audienceRoles === null) {
    update.audienceRoles = FieldValue.delete();
  } else if (Array.isArray(input.audienceRoles)) {
    update.audienceRoles = input.audienceRoles;
  }
  if (typeof input.videoUrl === 'string') update.videoUrl = input.videoUrl.trim();
  if (typeof input.videoPath === 'string') update.videoPath = input.videoPath.trim();
  if (input.thumbnailUrl === null) {
    update.thumbnailUrl = FieldValue.delete();
  } else if (typeof input.thumbnailUrl === 'string') {
    update.thumbnailUrl = input.thumbnailUrl.trim();
  }
  if (input.durationSeconds === null) {
    update.durationSeconds = FieldValue.delete();
  } else if (typeof input.durationSeconds === 'number') {
    update.durationSeconds = input.durationSeconds;
  }
  if (typeof input.sortOrder === 'number') update.sortOrder = input.sortOrder;
  if (typeof input.published === 'boolean') update.published = input.published;
  if (typeof input.active === 'boolean') update.active = input.active;

  await ref.update(update);

  const snapshot = await ref.get();
  return mapHelpTutorialDoc(snapshot.id, snapshot.data() ?? {});
}

export async function deleteHelpTutorial(id: string): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.HELP_TUTORIALS)
    .doc(id.trim())
    .delete();
}

export function serializeHelpTutorials(tutorials: HelpTutorial[]) {
  return tutorials.map(serializeHelpTutorial);
}
