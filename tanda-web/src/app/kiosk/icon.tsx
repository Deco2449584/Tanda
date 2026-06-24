import { renderKioskIcon } from '@/lib/pwa/render-kiosk-icon';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return renderKioskIcon({ size: 32, paddingRatio: 0.12 });
}
