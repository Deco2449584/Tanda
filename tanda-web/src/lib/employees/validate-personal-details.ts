import type { EmployeePersonalDetails } from '@/lib/types/employee';

export type PersonalDetailsValidationInput = Pick<
  EmployeePersonalDetails,
  | 'phone'
  | 'dateOfBirth'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'state'
  | 'postcode'
  | 'country'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'passportNumber'
  | 'visaExpiry'
>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month, day] = value.split('-').map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function yearsBetween(isoDate: string, reference = new Date()): number {
  const birth = new Date(`${isoDate}T12:00:00`);
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function validateOptionalPhone(label: string, value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (digitCount(trimmed) < 8 || digitCount(trimmed) > 15) {
    return `${label} must include between 8 and 15 digits.`;
  }
  if (!/^[+\d][\d\s().-]{6,24}$/.test(trimmed)) {
    return `${label} format looks invalid. Use digits and optional + ( ) - spaces.`;
  }
  return null;
}

function validateOptionalText(
  label: string,
  value: string | undefined,
  options?: { min?: number; max?: number; pattern?: RegExp; patternMessage?: string },
): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const min = options?.min ?? 1;
  const max = options?.max ?? 120;
  if (trimmed.length < min || trimmed.length > max) {
    return `${label} must be between ${min} and ${max} characters.`;
  }
  if (options?.pattern && !options.pattern.test(trimmed)) {
    return options.patternMessage ?? `${label} format looks invalid.`;
  }
  return null;
}

/** Minimal structure checks for personal profile fields (empty values are allowed). */
export function validatePersonalDetails(
  form: PersonalDetailsValidationInput,
): string | null {
  const phoneError = validateOptionalPhone('Phone', form.phone);
  if (phoneError) return phoneError;

  const emergencyPhoneError = validateOptionalPhone(
    'Emergency phone',
    form.emergencyContactPhone,
  );
  if (emergencyPhoneError) return emergencyPhoneError;

  const dob = form.dateOfBirth?.trim() ?? '';
  if (dob) {
    if (!isValidIsoDate(dob)) {
      return 'Date of birth must be a valid date.';
    }
    const age = yearsBetween(dob);
    if (age < 14 || age > 100) {
      return 'Date of birth must match a realistic working age (14–100).';
    }
  }

  const visaExpiry = form.visaExpiry?.trim() ?? '';
  if (visaExpiry && !isValidIsoDate(visaExpiry)) {
    return 'Visa expiry must be a valid date.';
  }

  const address1Error = validateOptionalText('Address line 1', form.addressLine1, {
    min: 3,
    max: 120,
  });
  if (address1Error) return address1Error;

  const address2Error = validateOptionalText('Address line 2', form.addressLine2, {
    min: 1,
    max: 120,
  });
  if (address2Error) return address2Error;

  const cityError = validateOptionalText('City', form.city, { min: 2, max: 80 });
  if (cityError) return cityError;

  const stateError = validateOptionalText('State / region', form.state, {
    min: 2,
    max: 80,
  });
  if (stateError) return stateError;

  const postcodeError = validateOptionalText('Postcode', form.postcode, {
    min: 3,
    max: 10,
    pattern: /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/,
    patternMessage: 'Postcode format looks invalid.',
  });
  if (postcodeError) return postcodeError;

  const countryError = validateOptionalText('Country', form.country, {
    min: 2,
    max: 80,
  });
  if (countryError) return countryError;

  const emergencyNameError = validateOptionalText(
    'Emergency contact',
    form.emergencyContactName,
    {
      min: 2,
      max: 80,
      pattern: /^[\p{L}][\p{L}\s.'-]{1,79}$/u,
      patternMessage: 'Emergency contact name should use letters only.',
    },
  );
  if (emergencyNameError) return emergencyNameError;

  const passportError = validateOptionalText('Passport number', form.passportNumber, {
    min: 5,
    max: 20,
    pattern: /^[A-Za-z0-9][A-Za-z0-9\s-]{4,19}$/,
    patternMessage: 'Passport number should be 5–20 letters or digits.',
  });
  if (passportError) return passportError;

  return null;
}
