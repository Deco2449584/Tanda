export function isKioskStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone =
    'standalone' in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    iosStandalone ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}
