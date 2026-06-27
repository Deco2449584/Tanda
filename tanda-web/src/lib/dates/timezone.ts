/** Returns YYYY-MM-DD for a date in the given IANA timezone. */
export function toInputDateInTimeZone(
  timeZone: string,
  date: Date = new Date(),
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

/** Returns minutes since midnight for a date in the given IANA timezone. */
export function getMinutesInTimeZone(
  timeZone: string,
  date: Date = new Date(),
): number {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone,
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
  timeZone: string,
): number {
  return getMinutesInTimeZone(timeZone, timestamp.toDate());
}
