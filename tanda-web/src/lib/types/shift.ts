export type ShiftStatus = 'scheduled' | 'completed' | 'absent';

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
}

export interface Shift extends ShiftFirestore {
  id: string;
}

export interface AssignShiftInput {
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  locationId?: string;
}
