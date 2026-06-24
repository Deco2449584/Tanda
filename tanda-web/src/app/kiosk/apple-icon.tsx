import { renderKioskIcon } from '@/lib/pwa/render-kiosk-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return renderKioskIcon({ size: 180, paddingRatio: 0.14 });
}
