import {
  STATUS_IDENTIFICATION,
  STATUS_LOADED,
  STATUS_PROCESSED,
  resolveInspectionStatus,
  type InspectionStatusKind,
} from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const STEPS: { status: InspectionStatusKind; label: string; color: string }[] = [
  { status: 'identification', label: 'Identification', color: STATUS_IDENTIFICATION },
  { status: 'processed', label: 'Processed', color: STATUS_PROCESSED },
  { status: 'loaded', label: 'On truck', color: STATUS_LOADED },
];

const ORDER: InspectionStatusKind[] = ['identification', 'processed', 'loaded'];

export function LifecycleStepper({
  inspection,
  mutedBarClass = 'bg-zinc-700',
  mutedLabelClass = 'text-subtle',
}: {
  inspection: Pick<CargoInspection, 'status'>;
  mutedBarClass?: string;
  mutedLabelClass?: string;
}) {
  const current = resolveInspectionStatus(inspection);
  const currentIndex = ORDER.indexOf(current);

  return (
    <div className="mb-4 flex items-center gap-1.5">
      {STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <div key={step.status} className="min-w-0 flex-1 space-y-1.5">
            <div
              className={`h-1 rounded-sm ${reached ? '' : mutedBarClass}`}
              style={reached ? { backgroundColor: step.color } : undefined}
            />
            <p
              className={`truncate text-[11px] font-medium ${reached ? '' : mutedLabelClass}`}
              style={reached ? { color: step.color } : undefined}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
