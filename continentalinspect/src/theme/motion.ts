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

/** Light cards stay on a pale surface, so Android elevation would paint a black plate. */
export function cardShadow(backgroundPrimary: string) {
  const light = backgroundPrimary.toLowerCase() === '#eef3f8';
  if (light) {
    return {
      shadowColor: '#1E3A5F',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 0,
    };
  }
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 2,
  };
}

export const motion = {
  pressScale: 0.98,
  enterDuration: 360,
  pressIn: 110,
  pressOut: 170,
  staggerMs: 42,
  staggerCap: 6,
} as const;
