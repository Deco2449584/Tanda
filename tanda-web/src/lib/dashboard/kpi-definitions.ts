import { ClipboardList, DollarSign, Hourglass, Users } from 'lucide-react';
import type { KpiMetric } from './types';

export const baseKpiMetrics: KpiMetric[] = [
  {
    id: 'active-staff',
    title: 'Active Staff Today',
    value: '0/0',
    description: 'Employees on Shift',
    accent: 'blue',
    icon: Users,
  },
  {
    id: 'late-alerts',
    title: 'Late Arrival Alerts',
    value: '0',
    description: 'LATE ARRIVALS',
    accent: 'orange',
    icon: Hourglass,
  },
  {
    id: 'pending-permits',
    title: 'Pending Leave Requests',
    value: '0',
    description: 'TO REVIEW',
    accent: 'yellow',
    icon: ClipboardList,
  },
  {
    id: 'payroll-cost',
    title: "Today's Payroll Cost",
    value: '$0.00',
    valueLabel: 'Actual',
    description: 'Projected: $0.00',
    accent: 'emerald',
    icon: DollarSign,
  },
];
