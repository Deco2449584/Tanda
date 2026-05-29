import type { LucideIcon } from 'lucide-react';

export type KpiAccent = 'emerald' | 'orange' | 'yellow';

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  description: string;
  accent: KpiAccent;
  icon: LucideIcon;
  sparkline?: number[];
}

export interface WeeklyHoursDatum {
  day: string;
  horas: number;
}

export interface ShiftLoadDatum {
  department: string;
  turnos: number;
}
