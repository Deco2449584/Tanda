const SIZE = 168;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const SEGMENT_COLORS = {
  warehouse: '#0288D1',
  truck: '#4CAF50',
} as const;

interface WarehouseMixDonutProps {
  newCargo: number;
  loaded: number;
}

export function WarehouseMixDonut({
  newCargo,
  loaded,
}: WarehouseMixDonutProps) {
  const segments = [
    { label: 'In warehouse', value: newCargo, color: SEGMENT_COLORS.warehouse },
    { label: 'On truck', value: loaded, color: SEGMENT_COLORS.truck },
  ];

  const total = newCargo + loaded;

  let offset = 0;
  const arcs = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const length = (segment.value / total) * CIRCUMFERENCE;
      const arc = {
        ...segment,
        dasharray: `${length} ${CIRCUMFERENCE - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return arc;
    });

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="text-sm font-semibold text-foreground">
        Warehouse mix today
      </h2>

      {total === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">
          No warehouse or truck cargo today yet. Register a unit to see the
          breakdown here.
        </p>
      ) : (
        <>
          <div className="relative mx-auto mt-4 w-[168px]">
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              role="img"
              aria-label={`${newCargo} in warehouse, ${loaded} on truck`}
            >
              <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={STROKE}
                  fill="none"
                />
                {arcs.map((arc) => (
                  <circle
                    key={arc.label}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke={arc.color}
                    strokeWidth={STROKE}
                    strokeDasharray={arc.dasharray}
                    strokeDashoffset={arc.dashoffset}
                    strokeLinecap="butt"
                    fill="none"
                  />
                ))}
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-3xl text-foreground">{total}</p>
              <p className="mt-0.5 text-[11px] text-muted">Warehouse + truck</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {segments.map((segment) => {
              const pct = Math.round((segment.value / total) * 100);
              return (
                <li
                  key={segment.label}
                  className="flex items-center gap-2.5 text-[13px]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden
                  />
                  <span className="flex-1 text-muted">
                    {segment.label} ({pct}%)
                  </span>
                  <span className="font-semibold text-foreground">
                    {segment.value}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
