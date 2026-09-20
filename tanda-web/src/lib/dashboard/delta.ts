export type DeltaSentiment = 'higher-is-better' | 'lower-is-better' | 'neutral';

export interface DeltaInfo {
  current: number;
  previous: number;
  absolute: number;
  percent: number | null;
  direction: 'up' | 'down' | 'flat';
}

export function computeDelta(current: number, previous: number): DeltaInfo {
  const absolute = Math.round((current - previous) * 100) / 100;
  const percent =
    previous === 0
      ? null
      : Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;

  return {
    current,
    previous,
    absolute,
    percent,
    direction: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat',
  };
}
