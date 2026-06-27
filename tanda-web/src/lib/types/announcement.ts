import type { Timestamp } from 'firebase/firestore';

export type AnnouncementAudience = 'all' | 'department' | 'location';

export interface AnnouncementFirestore {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceValue?: string;
  recipientCount: number;
  emailSentCount: number;
  notificationCount: number;
  pushSentCount: number;
  createdByEmail: string;
  createdByName?: string;
  createdAt: Timestamp;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceValue?: string;
  recipientCount: number;
  emailSentCount: number;
  notificationCount: number;
  pushSentCount: number;
  createdByEmail: string;
  createdByName?: string;
  createdAt: number;
}

export interface BroadcastAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceValue?: string;
}
