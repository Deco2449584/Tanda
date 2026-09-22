export const radius = {
  card: 22,
  control: 14,
  thumb: 12,
  pill: 999,
} as const;

export const widgetShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
} as const;

export const motion = {
  pressScale: 0.98,
  enterDuration: 360,
  pressIn: 110,
  pressOut: 170,
  staggerMs: 42,
  staggerCap: 6,
} as const;
