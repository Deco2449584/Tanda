import type { LucideIcon } from 'lucide-react';
import type { AdminModuleKey } from '@/lib/types/admin-permissions';

export type KpiAccent =
  | 'blue'
  | 'emerald'
  | 'orange'
  | 'yellow'
  | 'violet'
  | 'rose'
  | 'cyan';

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
  /** Module required to show this KPI. Omit = always (when dashboard is open). */
  requiresModule?: AdminModuleKey;
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
  | 'leave'
  | 'training'
  | 'operations';

export type DashboardChartType =
  | 'kpi'
  | 'live'
  | 'pie'
  | 'bar'
  | 'grouped-bar'
  | 'area'
  | 'list';

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  description: string;
  category: DashboardWidgetCategory;
  chartType: DashboardChartType;
  defaultVisible: boolean;
  defaultExpanded: boolean;
  /**
   * Module permission required to see this widget.
   * Omit for always-available dashboard chrome (e.g. Key metrics shell).
   */
  requiresModule?: AdminModuleKey;
}
