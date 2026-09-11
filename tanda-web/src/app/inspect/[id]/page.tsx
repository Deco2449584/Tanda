'use client';

import { useParams } from 'next/navigation';
import { InspectDetailScreen } from '@/components/inspect/InspectDetailScreen';

export default function InspectDetailPage() {
  const params = useParams<{ id: string }>();
  return <InspectDetailScreen inspectionId={params?.id ?? ''} />;
}
