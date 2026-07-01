import { auth } from '@/lib/firebase';
import type { Announcement, BroadcastAnnouncementInput, UpdateAnnouncementInput } from '@/lib/types/announcement';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchMyAnnouncements(): Promise<Announcement[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/announcements/mine', { headers });

  if (!response.ok) {
    throw new Error('Could not load announcements.');
  }

  const data = (await response.json()) as { announcements: Announcement[] };
  return data.announcements;
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/announcements', { headers });

  if (!response.ok) {
    throw new Error('Could not load announcements.');
  }

  const data = (await response.json()) as { announcements: Announcement[] };
  return data.announcements;
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
    headers,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('Could not load announcement.');
  }

  const data = (await response.json()) as { announcement: Announcement };
  return data.announcement;
}

export async function updateAnnouncementRequest(
  id: string,
  payload: UpdateAnnouncementInput,
): Promise<Announcement> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? 'Could not update announcement.');
  }

  const data = (await response.json()) as { announcement: Announcement };
  return data.announcement;
}

export async function deleteAnnouncementRequest(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? 'Could not delete announcement.');
  }
}

export async function broadcastAnnouncementRequest(input: {
  payload: BroadcastAnnouncementInput;
  createdByName?: string;
}): Promise<Announcement> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/announcements', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...input.payload,
      createdByName: input.createdByName,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? 'Could not send announcement.');
  }

  const data = (await response.json()) as { announcement: Announcement };
  return data.announcement;
}
