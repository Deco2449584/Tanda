/**
 * Continental Inspect palettes — dark (default brand) and light mode.
 */
export const darkPalette = {
  background: {
    primary: '#0B0B0D',
    secondary: '#161618',
  },
  surface: {
    default: '#161618',
    elevated: '#1E1E22',
    card: '#1A1A1E',
    muted: '#26262A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B8B8B8',
    mutedOnDark: '#A0A0A0',
    onSurface: '#F4F4F5',
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
    default: '#2A2A2E',
    onSurface: '#2E2E34',
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
