import { KpiCard } from './KpiCard';
import { kpiMetrics } from './mock-data';

export function KpiGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {kpiMetrics.map((metric) => (
        <KpiCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
