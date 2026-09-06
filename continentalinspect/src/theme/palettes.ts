/**
 * Continental Inspect palettes — dark (default brand) and light mode.
 */
export const darkPalette = {
  background: {
    primary: '#000000',
    secondary: '#141414',
  },
  surface: {
    default: '#141414',
    elevated: '#1C1C1E',
    card: '#1C1C1E',
    muted: '#2C2C2E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B8B8B8',
    mutedOnDark: '#A0A0A0',
    onSurface: '#F0F0F0',
    onSurfaceMuted: '#9CA3AF',
    onAccent: '#FFFFFF',
  },
  accent: {
    primary: '#0265DC',
    primaryPressed: '#0D47A1',
    secondary: '#000000',
    secondaryPressed: '#2A2A2A',
  },
  border: {
    default: '#333333',
    onSurface: '#3A3A3C',
    brand: '#000000',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#3B82F6',
  },
} as const;

export const lightPalette = {
  background: {
    primary: '#F4F4F5',
    secondary: '#FFFFFF',
  },
  surface: {
    default: '#FFFFFF',
    elevated: '#FFFFFF',
    card: '#FFFFFF',
    muted: '#F0F0F0',
  },
  text: {
    primary: '#111111',
    secondary: '#5C5C5C',
    mutedOnDark: '#6B6B6B',
    onSurface: '#1A1A1A',
    onSurfaceMuted: '#6B6B6B',
    onAccent: '#FFFFFF',
  },
  accent: {
    primary: '#0265DC',
    primaryPressed: '#0D47A1',
    secondary: '#000000',
    secondaryPressed: '#2A2A2A',
  },
  border: {
    default: '#E0E0E0',
    onSurface: '#D1D5DB',
    brand: '#000000',
  },
  semantic: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#3B82F6',
  },
} as const;

export type AppColors = {
  readonly [K in keyof typeof darkPalette]: {
    readonly [P in keyof (typeof darkPalette)[K]]: string;
  };
};

export type ColorScheme = 'light' | 'dark';

export function getPalette(scheme: ColorScheme): AppColors {
  return scheme === 'dark' ? darkPalette : lightPalette;
}
