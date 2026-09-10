import { ScanPunchPanel } from '@/components/attendance/ScanPunchPanel';

interface PunchScanPageProps {
  params: Promise<{ token: string }>;
}

export default async function PunchScanPage({ params }: PunchScanPageProps) {
  const { token } = await params;
  const cleanToken = decodeURIComponent(token ?? '').trim();

  if (!cleanToken) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
        <p className="text-sm text-muted">This scan link is incomplete.</p>
      </div>
    );
  }

  return <ScanPunchPanel token={cleanToken} />;
}
