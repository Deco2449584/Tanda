export type EmployeeShiftAlertType = 'assigned' | 'cancelled';

export interface EmployeeShiftAlert {
  id: string;
  type: EmployeeShiftAlertType;
  title: string;
  description: string;
  href: string;
  shiftId: string;
  createdAt: number;
  read: boolean;
}

const STORAGE_PREFIX = 'tanda-shift-alerts';

function storageKey(employeeCode: string) {
  return `${STORAGE_PREFIX}:${employeeCode}`;
}

export function loadEmployeeShiftAlerts(employeeCode: string): EmployeeShiftAlert[] {
  if (typeof window === 'undefined' || !employeeCode.trim()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(employeeCode));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as EmployeeShiftAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEmployeeShiftAlerts(
  employeeCode: string,
  alerts: EmployeeShiftAlert[],
) {
  if (typeof window === 'undefined' || !employeeCode.trim()) {
    return;
  }

  window.localStorage.setItem(storageKey(employeeCode), JSON.stringify(alerts));
}

export function clearEmployeeShiftAlerts(employeeCode: string) {
  if (typeof window === 'undefined' || !employeeCode.trim()) {
    return;
  }

  window.localStorage.removeItem(storageKey(employeeCode));
}

export function buildShiftAlert(input: {
  type: EmployeeShiftAlertType;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
}): EmployeeShiftAlert {
  const timeRange =
    input.startTime && input.endTime
      ? `${input.startTime}–${input.endTime}`
      : input.startTime || input.endTime;
  const detail = [input.date, timeRange].filter(Boolean).join(' · ');

  if (input.type === 'cancelled') {
    return {
      id: `${input.type}:${input.shiftId}:${Date.now()}`,
      type: input.type,
      title: 'Shift cancelled',
      description: detail
        ? `Your shift on ${detail} was cancelled.`
        : 'One of your shifts was cancelled.',
      href: '/my-schedule',
      shiftId: input.shiftId,
      createdAt: Date.now(),
      read: false,
    };
  }

  return {
    id: `${input.type}:${input.shiftId}:${Date.now()}`,
    type: input.type,
    title: 'New shift assigned',
    description: detail
      ? `You have a new shift on ${detail}.`
      : 'You have a new shift on your schedule.',
    href: '/my-schedule',
    shiftId: input.shiftId,
    createdAt: Date.now(),
    read: false,
  };
}
