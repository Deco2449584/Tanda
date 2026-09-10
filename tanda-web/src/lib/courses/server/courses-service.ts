import { FieldValue } from 'firebase-admin/firestore';
import {
  mapCourseDoc,
  serializeCourse,
} from '@/lib/courses/map-course';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  COURSE_CATEGORIES,
  type Course,
  type CourseCategory,
  type CreateCourseInput,
  type UpdateCourseInput,
} from '@/lib/types/course';

function parseCategory(value: string): CourseCategory {
  const trimmed = value.trim();
  if ((COURSE_CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CourseCategory;
  }
  return 'Other';
}

function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Course URL is required.');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid course URL (https://…).');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Course URL must start with http:// or https://.');
  }

  return parsed.toString();
}

function normalizeDueDate(value: string | undefined | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Due date must be YYYY-MM-DD.');
  }
  return trimmed;
}

export async function listAllCourses(): Promise<Course[]> {
  const snapshot = await getAdminFirestore().collection(COLLECTIONS.COURSES).get();

  return snapshot.docs
    .map((document) => mapCourseDoc(document.id, document.data()))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.title.localeCompare(b.title);
    });
}

export async function listActiveCourses(): Promise<Course[]> {
  const courses = await listAllCourses();
  return courses.filter((course) => course.active);
}

export async function getCourseById(id: string): Promise<Course | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.COURSES)
    .doc(id.trim())
    .get();

  if (!snapshot.exists) return null;
  return mapCourseDoc(snapshot.id, snapshot.data() ?? {});
}

export async function createCourse(input: {
  payload: CreateCourseInput;
  createdByEmail: string;
}): Promise<Course> {
  const title = input.payload.title.trim();
  const description = input.payload.description.trim();
  const externalUrl = normalizeExternalUrl(input.payload.externalUrl);
  const platformName = input.payload.platformName?.trim();
  const dueDate = normalizeDueDate(input.payload.dueDate);

  if (!title) throw new Error('Title is required.');

  const ref = getAdminFirestore().collection(COLLECTIONS.COURSES).doc();
  const payload: Record<string, unknown> = {
    title,
    description,
    externalUrl,
    category: parseCategory(input.payload.category),
    active: input.payload.active !== false,
    sortOrder: input.payload.sortOrder ?? 0,
    createdByEmail: input.createdByEmail.trim().toLowerCase(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (platformName) payload.platformName = platformName;
  if (dueDate) payload.dueDate = dueDate;

  await ref.set(payload);
  const snapshot = await ref.get();
  return mapCourseDoc(snapshot.id, snapshot.data() ?? {});
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
): Promise<Course> {
  const ref = getAdminFirestore().collection(COLLECTIONS.COURSES).doc(id.trim());
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Course not found.');

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof input.title === 'string') {
    const title = input.title.trim();
    if (!title) throw new Error('Title is required.');
    update.title = title;
  }
  if (typeof input.description === 'string') {
    update.description = input.description.trim();
  }
  if (typeof input.externalUrl === 'string') {
    update.externalUrl = normalizeExternalUrl(input.externalUrl);
  }
  if (input.platformName === null) {
    update.platformName = FieldValue.delete();
  } else if (typeof input.platformName === 'string') {
    const platform = input.platformName.trim();
    update.platformName = platform || FieldValue.delete();
  }
  if (typeof input.category === 'string') {
    update.category = parseCategory(input.category);
  }
  if (input.dueDate === null) {
    update.dueDate = FieldValue.delete();
  } else if (typeof input.dueDate === 'string') {
    const dueDate = normalizeDueDate(input.dueDate);
    update.dueDate = dueDate ?? FieldValue.delete();
  }
  if (typeof input.sortOrder === 'number') update.sortOrder = input.sortOrder;
  if (typeof input.active === 'boolean') update.active = input.active;

  await ref.update(update);
  const snapshot = await ref.get();
  return mapCourseDoc(snapshot.id, snapshot.data() ?? {});
}

export async function deleteCourse(id: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.COURSES).doc(id.trim()).delete();
}

export function serializeCourses(courses: Course[]) {
  return courses.map(serializeCourse);
}
