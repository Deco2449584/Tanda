import { auth } from '@/lib/firebase';
import type {
  CreateHelpTutorialInput,
  UpdateHelpTutorialInput,
} from '@/lib/types/help-tutorial';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface SerializedHelpTutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  audienceValue?: string;
  audienceRoles?: string[];
  videoUrl: string;
  videoPath: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sortOrder: number;
  published: boolean;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function fetchHelpTutorials(): Promise<{
  tutorials: SerializedHelpTutorial[];
  categories: string[];
}> {
  const response = await fetch('/api/help/tutorials', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    tutorials?: SerializedHelpTutorial[];
    categories?: string[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load tutorials.');
  }
  return {
    tutorials: data?.tutorials ?? [],
    categories: data?.categories ?? [],
  };
}

export async function fetchHelpTutorialsAdmin(): Promise<{
  tutorials: SerializedHelpTutorial[];
  categories: string[];
}> {
  const response = await fetch('/api/help/tutorials/manage', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    tutorials?: SerializedHelpTutorial[];
    categories?: string[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load tutorials.');
  }
  return {
    tutorials: data?.tutorials ?? [],
    categories: data?.categories ?? [],
  };
}

export async function fetchHelpTutorialCategories(): Promise<string[]> {
  const response = await fetch('/api/help/tutorials/categories', {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as {
    categories?: string[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not load categories.');
  }
  return data?.categories ?? [];
}

export async function addHelpTutorialCategoryRequest(name: string): Promise<string[]> {
  const response = await fetch('/api/help/tutorials/categories', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = (await response.json().catch(() => null)) as {
    categories?: string[];
    error?: string;
  } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not add category.');
  }
  return data?.categories ?? [];
}

export async function createHelpTutorialRequest(
  payload: CreateHelpTutorialInput,
): Promise<SerializedHelpTutorial> {
  const response = await fetch('/api/help/tutorials/manage', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    tutorial?: SerializedHelpTutorial;
    error?: string;
  } | null;
  if (!response.ok || !data?.tutorial) {
    throw new Error(data?.error ?? 'Could not create tutorial.');
  }
  return data.tutorial;
}

export async function updateHelpTutorialRequest(
  id: string,
  payload: UpdateHelpTutorialInput,
): Promise<SerializedHelpTutorial> {
  const response = await fetch(`/api/help/tutorials/${id}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as {
    tutorial?: SerializedHelpTutorial;
    error?: string;
  } | null;
  if (!response.ok || !data?.tutorial) {
    throw new Error(data?.error ?? 'Could not update tutorial.');
  }
  return data.tutorial;
}

export async function deleteHelpTutorialRequest(id: string): Promise<void> {
  const response = await fetch(`/api/help/tutorials/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not delete tutorial.');
  }
}
