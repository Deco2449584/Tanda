import type { AttendanceType } from '@/lib/types/attendance';

export function formatKioskActionLabel(actionType: AttendanceType): string {
  switch (actionType) {
    case 'check_in':
      return 'Clock In';
    case 'check_out':
      return 'Clock Out';
    case 'break_start':
      return 'Start Break';
    case 'break_end':
      return 'End Break';
  }
}

export function formatKioskActionSuccess(actionType: AttendanceType): string {
  switch (actionType) {
    case 'check_in':
      return 'SUCCESSFUL CLOCK IN';
    case 'check_out':
      return 'SUCCESSFUL CLOCK OUT';
    case 'break_start':
      return 'BREAK STARTED';
    case 'break_end':
      return 'BREAK ENDED';
  }
}
