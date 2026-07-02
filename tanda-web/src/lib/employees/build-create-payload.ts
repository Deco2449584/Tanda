import type { CreateEmployeeFormValues } from '@/lib/types/employee';
import { todayIsoDate } from '@/lib/employees/employment-dates';

const PERSONAL_STRING_FIELDS = [
  'phone',
  'dateOfBirth',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postcode',
  'country',
  'emergencyContactName',
  'emergencyContactPhone',
  'passportNumber',
  'passportUrl',
  'passportFileName',
  'visaUrl',
  'visaFileName',
  'visaExpiry',
] as const;

export function buildEmployeeCreatePayload(input: {
  form: CreateEmployeeFormValues;
  photoUrl?: string;
  passport?: { url: string; fileName: string };
  visa?: { url: string; fileName: string };
}): Record<string, unknown> {
  const { form, photoUrl, passport, visa } = input;

  const payload: Record<string, unknown> = {
    employeeId: form.employeeId.trim(),
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    department: form.department.trim(),
    hourlyRate: form.hourlyRate,
    active: true,
    kioskEnabled: false,
    lastAction: 'none',
  };

  if (photoUrl) {
    payload.photoUrl = photoUrl;
  }

  if (form.locationId?.trim()) {
    payload.locationId = form.locationId.trim();
  }

  if (form.locationGroupId?.trim()) {
    payload.locationGroupId = form.locationGroupId.trim();
  }

  if (form.startDate?.trim()) {
    payload.startDate = form.startDate.trim();
  }

  if (form.endDate?.trim()) {
    payload.endDate = form.endDate.trim();
  }

  for (const field of PERSONAL_STRING_FIELDS) {
    const value = form[field]?.trim();
    if (value) {
      payload[field] = value;
    }
  }

  if (passport) {
    payload.passportUrl = passport.url;
    payload.passportFileName = passport.fileName;
  }

  if (visa) {
    payload.visaUrl = visa.url;
    payload.visaFileName = visa.fileName;
  }

  return payload;
}

/** Update payload — must not touch kiosk punch fields (`lastAction`, `lastTimestampServer`). */
export function buildEmployeeUpdatePayload(input: {
  form: CreateEmployeeFormValues;
  active: boolean;
  kioskEnabled: boolean;
  photoUrl?: string;
  passport?: { url: string; fileName: string };
  visa?: { url: string; fileName: string };
}): Record<string, unknown> {
  const payload = buildEmployeeCreatePayload({
    form: input.form,
    photoUrl: input.photoUrl,
    passport: input.passport,
    visa: input.visa,
  });

  delete payload.lastAction;
  payload.active = input.active;
  payload.kioskEnabled = input.kioskEnabled;

  return payload;
}

export const initialCreateEmployeeForm: CreateEmployeeFormValues = {
  employeeId: '',
  name: '',
  email: '',
  department: '',
  locationId: '',
  locationGroupId: '',
  hourlyRate: 0,
  startDate: todayIsoDate(),
  endDate: '',
  phone: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postcode: '',
  country: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  passportNumber: '',
  visaExpiry: '',
};
