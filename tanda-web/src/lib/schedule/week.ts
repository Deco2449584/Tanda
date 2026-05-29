export interface WeekDay {
  label: string;
  date: string;
}

export interface WeekRange {
  start: string;
  end: string;
  days: WeekDay[];
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonday(date: Date): Date {
  const monday = new Date(date);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function buildWeekRange(referenceDate: Date = new Date()): WeekRange {
  const monday = getMonday(referenceDate);
  const days: WeekDay[] = [];

  for (let index = 0; index < 7; index += 1) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    days.push({
      label: DAY_LABELS[index],
      date: toInputDate(current),
    });
  }

  return {
    start: days[0].date,
    end: days[6].date,
    days,
  };
}

export function formatWeekRangeLabel(week: WeekRange): string {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const start = new Date(`${week.start}T00:00:00`);
  const end = new Date(`${week.end}T00:00:00`);

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function shiftWeek(referenceDate: Date, direction: -1 | 1): Date {
  const next = new Date(referenceDate);
  next.setDate(next.getDate() + direction * 7);
  return next;
}

export function formatTimeLabel(time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
