export const TEMPERATURE_MIN = -30;
export const TEMPERATURE_MAX = 40;

export function temperatureRatio(celsius: number): number {
  return Math.max(
    0,
    Math.min(1, (celsius - TEMPERATURE_MIN) / (TEMPERATURE_MAX - TEMPERATURE_MIN)),
  );
}

export function temperatureColor(celsius: number): string {
  const t = temperatureRatio(celsius);
  if (t < 0.25) return '#2563EB';
  if (t < 0.4) return '#0EA5E9';
  if (t < 0.55) return '#10B981';
  if (t < 0.72) return '#F59E0B';
  return '#EF4444';
}
