import { renderLogoIcon } from '@/lib/pwa/render-logo-icon';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return renderLogoIcon({ size: 32, paddingRatio: 0.08 });
}
