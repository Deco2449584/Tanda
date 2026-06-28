/** Continental Cargo brand palette — single source of truth */
export const BRAND = {
  graphite: '#262626',
  charcoal: '#606060',
  silver: '#CBCBCB',
  cloud: '#F5F5F5',
  magenta: '#F51EA0',
  gradient: 'linear-gradient(90deg, #262626 0%, #606060 100%)',
  /** Full-screen kiosk backdrop — graphite/charcoal, no blue tint */
  kioskBackground:
    'radial-gradient(125% 85% at 50% -10%, #606060 0%, #262626 42%, #1a1a1a 100%)',
} as const;

/** Legacy portal aliases — prefer BRAND directly in new code */
export const PORTAL_NAVY = BRAND.graphite;
export const PORTAL_NAVY_LIGHT = BRAND.charcoal;
export const PORTAL_ACCENT = BRAND.magenta;
