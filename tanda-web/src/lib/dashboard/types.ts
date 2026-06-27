import type { LucideIcon } from 'lucide-react';

export type KpiAccent = 'blue' | 'emerald' | 'orange' | 'yellow';

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  description: string;
  /** Etiqueta sobre el valor principal (ej. "Costo real"). */
  valueLabel?: string;
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

export interface NamedValueDatum {
  name: string;
  value: number;
}

export interface GroupedBarDatum {
  name: string;
  scheduled: number;
  actual: number;
}

export interface DailyHoursDatum {
  day: string;
  scheduled: number;
  actual: number;
}

export type DashboardWidgetCategory =
  | 'overview'
  | 'payroll'
  | 'attendance'
  | 'scheduling'
  | 'leave';

export type DashboardChartType = 'kpi' | 'pie' | 'bar' | 'grouped-bar' | 'area';

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: DashboardWidgetCategory;
  chartType: DashboardChartType;
  defaultVisible: boolean;
  defaultExpanded: boolean;
}
