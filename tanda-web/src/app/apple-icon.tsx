import { renderLogoIcon } from '@/lib/pwa/render-logo-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Light tile for Apple / home-screen style icons (aligned with PWA). */
export default function AppleIcon() {
  return renderLogoIcon({ size: 180, paddingRatio: 0.1, variant: 'pwa' });
}
