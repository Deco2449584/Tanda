export function formatShortDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  return parsed.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatShiftBlockLabel(
  date: string,
  startTime: string,
  endTime: string,
  status: 'scheduled' | 'completed',
): string {
  const timeStart = formatTime12h(startTime);
  const timeEnd = formatTime12h(endTime);
  const dayLabel = formatShortDate(date);

  if (status === 'completed') {
    return `${dayLabel}: Entrada ${timeStart} - Salida ${timeEnd} (Finalizado)`;
  }

  return `${dayLabel}: Entrada ${timeStart} - Salida ${timeEnd}`;
}

function formatTime12h(time: string): string {
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
