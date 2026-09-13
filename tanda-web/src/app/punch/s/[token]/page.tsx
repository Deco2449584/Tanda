import { ScanPunchPanel } from '@/components/attendance/ScanPunchPanel';
import { parseScanPunchVia } from '@/lib/attendance/scan-punch-token';

interface PunchScanPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}

export default async function PunchScanPage({
  params,
  searchParams,
}: PunchScanPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const cleanToken = decodeURIComponent(token ?? '').trim();
  const via = parseScanPunchVia(query.via);

  if (!cleanToken) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md items-center px-4">
        <p className="text-sm text-muted">This scan link is incomplete.</p>
      </div>
    );
  }

  return <ScanPunchPanel token={cleanToken} via={via} />;
}
