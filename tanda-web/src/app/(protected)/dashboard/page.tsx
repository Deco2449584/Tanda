'use client';

import { DynamicDashboard } from '@/components/dashboard/DynamicDashboard';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DashboardPage() {
  return (
    <PageContent className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Live presence, KPIs, and analytics for the modules you can access."
      />

      <DynamicDashboard />
    </PageContent>
  );
}
