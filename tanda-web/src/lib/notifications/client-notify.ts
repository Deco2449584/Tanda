import { auth } from '@/lib/firebase';

export interface ShiftNotificationInput {
  type: 'assigned' | 'cancelled';
  employeeId: string;
  shiftId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  department?: string;
  locationLabel?: string;
}

/** Fire-and-forget shift notification (in-app tray + optional push). */
export async function notifyShiftChange(input: ShiftNotificationInput): Promise<void> {
  try {
    const user = auth?.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    await fetch('/api/notifications/shift', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    console.warn('notifyShiftChange failed', error);
  }
}
