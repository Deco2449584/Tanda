export type ShiftStatus = 'scheduled' | 'completed' | 'absent';

export type ShiftConfirmationStatus = 'pending' | 'confirmed' | 'declined';

export interface ShiftFirestore {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  locationId?: string;
  locationNameSnapshot?: string;
  locationCitySnapshot?: string;
  status: ShiftStatus;
  note?: string;
  confirmationStatus?: ShiftConfirmationStatus;
  confirmationNote?: string;
  confirmedAt?: unknown;
}

export interface Shift extends Omit<ShiftFirestore, 'confirmedAt'> {
  id: string;
  confirmedAt?: number;
}

export interface AssignShiftInput {
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  /** When set, the modal updates an existing shift instead of creating one. */
  shiftId?: string;
}
