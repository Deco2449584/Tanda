import type { LucideIcon } from 'lucide-react';
import { ClipboardList, DollarSign, Hourglass, Users } from 'lucide-react';

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
  horasNormal: number;
  horasExtra: number;
}

export interface ShiftLoadDatum {
  department: string;
  horas: number;
}

export const kpiMetrics: KpiMetric[] = [
  {
    id: 'active-staff',
    title: 'Personal Activo Hoy',
    value: '18/22',
    description: 'Empleados en Turno',
    accent: 'emerald',
    icon: Users,
  },
  {
    id: 'late-alerts',
    title: 'Alertas de Tardanza',
    value: '3',
    description: 'LLEGADAS TARDES',
    accent: 'orange',
    icon: Hourglass,
  },
  {
    id: 'pending-permits',
    title: 'Permisos Pendientes',
    value: '5',
    description: 'POR REVISAR',
    accent: 'yellow',
    icon: ClipboardList,
  },
  {
    id: 'payroll-cost',
    title: 'Costo Nómina Hoy Est.',
    value: '$1,250.00',
    description: '',
    accent: 'emerald',
    icon: DollarSign,
    sparkline: [6, 9, 7, 11, 8, 13, 10, 12],
  },
];

export const weeklyHoursData: WeeklyHoursDatum[] = [
  { day: 'Lun', horasNormal: 28, horasExtra: 10 },
  { day: 'Mar', horasNormal: 35, horasExtra: 18 },
  { day: 'Mié', horasNormal: 32, horasExtra: 22 },
  { day: 'Jue', horasNormal: 40, horasExtra: 15 },
  { day: 'Vie', horasNormal: 38, horasExtra: 28 },
  { day: 'Sáb', horasNormal: 22, horasExtra: 12 },
  { day: 'Dom', horasNormal: 18, horasExtra: 8 },
];

export const shiftLoadData: ShiftLoadDatum[] = [
  { department: 'Almacén', horas: 12 },
  { department: 'Logística', horas: 9 },
  { department: 'Operaciones', horas: 14 },
  { department: 'Manten.', horas: 7 },
  { department: 'Admin', horas: 5 },
  { department: 'Seguridad', horas: 11 },
  { department: 'Calidad', horas: 8 },
  { department: 'RRHH', horas: 4 },
];
