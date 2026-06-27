'use client';

import { DynamicDashboard } from '@/components/dashboard/DynamicDashboard';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DashboardPage() {
  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="General control panel"
        description="Customizable analytics by location, period and metric."
      />

      <DynamicDashboard />
    </PageContent>
  );
}
