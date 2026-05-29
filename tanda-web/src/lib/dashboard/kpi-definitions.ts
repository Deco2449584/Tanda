import { ClipboardList, DollarSign, Hourglass, Users } from 'lucide-react';
import type { KpiMetric } from './types';

export const baseKpiMetrics: KpiMetric[] = [
  {
    id: 'active-staff',
    title: 'Personal Activo Hoy',
    value: '0/0',
    description: 'Empleados en Turno',
    accent: 'emerald',
    icon: Users,
  },
  {
    id: 'late-alerts',
    title: 'Alertas de Tardanza',
    value: '0',
    description: 'LLEGADAS TARDES',
    accent: 'orange',
    icon: Hourglass,
  },
  {
    id: 'pending-permits',
    title: 'Permisos Pendientes',
    value: '0',
    description: 'POR REVISAR',
    accent: 'yellow',
    icon: ClipboardList,
  },
  {
    id: 'payroll-cost',
    title: 'Costo Nómina Hoy Est.',
    value: '$0.00',
    description: '',
    accent: 'emerald',
    icon: DollarSign,
    sparkline: [6, 9, 7, 11, 8, 13, 10, 12],
  },
];
