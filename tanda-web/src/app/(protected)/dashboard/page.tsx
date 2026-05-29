import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ShiftLoadChart } from '@/components/dashboard/ShiftLoadChart';
import { WeeklyHoursChart } from '@/components/dashboard/WeeklyHoursChart';

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Panel de control general
      </h1>

      <KpiGrid />

      <WeeklyHoursChart />

      <ShiftLoadChart />
    </div>
  );
}
