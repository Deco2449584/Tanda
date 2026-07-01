import {
  Bell,
  CalendarClock,
  CalendarX,
  Clock,
  FileWarning,
  LogOut,
  Megaphone,
  Palmtree,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationType } from '@/lib/types/notification';

export interface NotificationVisualStyle {
  icon: LucideIcon;
  badgeClass: string;
}

const EMPLOYEE_NOTIFICATION_VISUALS: Record<NotificationType, NotificationVisualStyle> = {
  shift_assigned: {
    icon: CalendarClock,
    badgeClass: 'bg-primary/15 text-primary',
  },
  shift_cancelled: {
    icon: CalendarX,
    badgeClass: 'bg-zinc-500/15 text-zinc-300',
  },
  announcement: {
    icon: Megaphone,
    badgeClass: 'bg-sky-500/15 text-sky-300',
  },
  justification_required: {
    icon: FileWarning,
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  no_show: {
    icon: FileWarning,
    badgeClass: 'bg-red-500/15 text-red-300',
  },
  missing_checkin: {
    icon: Clock,
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  late_arrival: {
    icon: CalendarClock,
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
};

const ADMIN_ALERT_VISUALS: Record<string, NotificationVisualStyle> = {
  leave_pending: {
    icon: Palmtree,
    badgeClass: 'bg-emerald-500/15 text-emerald-300',
  },
  missing_checkin: {
    icon: Clock,
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  no_show_today: {
    icon: UserX,
    badgeClass: 'bg-red-500/15 text-red-300',
  },
  late_today: {
    icon: CalendarClock,
    badgeClass: 'bg-amber-500/15 text-amber-300',
  },
  forgotten_checkout: {
    icon: LogOut,
    badgeClass: 'bg-sky-500/15 text-sky-300',
  },
};

export function getEmployeeNotificationVisual(
  type: NotificationType,
): NotificationVisualStyle {
  return (
    EMPLOYEE_NOTIFICATION_VISUALS[type] ?? {
      icon: Bell,
      badgeClass: 'bg-primary/15 text-primary',
    }
  );
}

export function getAdminAlertVisual(alertId: string): NotificationVisualStyle {
  return (
    ADMIN_ALERT_VISUALS[alertId] ?? {
      icon: Bell,
      badgeClass: 'bg-primary/15 text-primary',
    }
  );
}
