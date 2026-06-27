import type { Timestamp } from 'firebase/firestore';

export type NotificationAudience = 'employee' | 'admin';

export type NotificationType =
  | 'shift_assigned'
  | 'shift_cancelled'
  | 'announcement'
  | 'justification_required'
  | 'missing_checkin'
  | 'late_arrival';

export interface NotificationFirestore {
  recipientEmail: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  dismissed: boolean;
  createdAt: Timestamp;
  metadata?: Record<string, string | number | boolean>;
}

export interface AppNotification {
  id: string;
  recipientEmail: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  dismissed: boolean;
  createdAt: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationPreferencesFirestore {
  recipientEmail: string;
  dismissedAdminAlertKeys: string[];
  updatedAt: Timestamp;
}
