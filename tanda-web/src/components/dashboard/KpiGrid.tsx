import { KpiCard } from './KpiCard';
import type { KpiMetric } from '@/lib/dashboard/types';

interface KpiGridProps {
  metrics: KpiMetric[];
  loadingIds?: string[];
}

export function KpiGrid({ metrics, loadingIds = [] }: KpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <KpiCard
          key={metric.id}
          metric={metric}
          loading={loadingIds.includes(metric.id)}
        />
      ))}
    </div>
  );
}
