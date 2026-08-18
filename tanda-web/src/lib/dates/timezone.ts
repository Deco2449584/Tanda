/** Returns YYYY-MM-DD for a date in the given IANA timezone. */
export function toInputDateInTimeZone(
  ianaTimeZone: string,
  date: Date = new Date(),
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ianaTimeZone }).format(date);
}

/** Returns minutes since midnight for a date in the given IANA timezone. */
export function getMinutesInTimeZone(
  ianaTimeZone: string,
  date: Date = new Date(),
): number {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: ianaTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

export function timestampToMinutesInTimeZone(
  timestamp: { toDate(): Date },
  ianaTimeZone: string,
): number {
  return getMinutesInTimeZone(ianaTimeZone, timestamp.toDate());
}
