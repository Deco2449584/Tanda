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

/** Converts a wall-clock date+time in an IANA zone into a UTC Date. */
export function dateFromWallClock(
  isoDate: string,
  timeHHmm: string,
  ianaTimeZone: string,
): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [rawHour, rawMinute] = timeHHmm.split(':').map(Number);
  let hour = Number.isFinite(rawHour) ? rawHour : 0;
  const minute = Number.isFinite(rawMinute) ? rawMinute : 0;
  let extraDays = 0;
  if (hour >= 24) {
    extraDays = Math.floor(hour / 24);
    hour %= 24;
  }

  let utcMs = Date.UTC((year ?? 1970), (month ?? 1) - 1, (day ?? 1) + extraDays, hour, minute, 0);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utcMs));
    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    const actual = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
    );
    const desired = Date.UTC(
      year ?? 1970,
      (month ?? 1) - 1,
      (day ?? 1) + extraDays,
      hour,
      minute,
    );
    utcMs += desired - actual;
  }

  return new Date(utcMs);
}
