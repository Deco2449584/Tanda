import { KioskAuthGuard } from '@/components/kiosk/KioskAuthGuard';

export const metadata = {
  title: 'TimeTracker Kiosk | Continental Cargo',
  description: 'Employee check-in kiosk',
};

export default function KioskPage() {
  return <KioskAuthGuard />;
}
