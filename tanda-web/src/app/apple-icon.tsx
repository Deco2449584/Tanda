import { renderLogoIcon } from '@/lib/pwa/render-logo-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return renderLogoIcon({ size: 180, paddingRatio: 0.1 });
}
