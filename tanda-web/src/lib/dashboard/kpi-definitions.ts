import {
  Cake,
  ClipboardList,
  DollarSign,
  GraduationCap,
  Hourglass,
  LifeBuoy,
  Users,
} from 'lucide-react';
import type { AdminModuleKey } from '@/lib/types/admin-permissions';
import type { KpiMetric } from './types';

export const baseKpiMetrics: KpiMetric[] = [
  {
    id: 'active-staff',
    title: 'Active Staff Today',
    value: '0/0',
    description: 'Employees on Shift',
    accent: 'blue',
    icon: Users,
    requiresModule: 'attendance',
  },
  {
    id: 'late-alerts',
    title: 'Late Arrival Alerts',
    value: '0',
    description: 'LATE ARRIVALS',
    accent: 'orange',
    icon: Hourglass,
    requiresModule: 'attendance',
  },
  {
    id: 'pending-permits',
    title: 'Pending Leave Requests',
    value: '0',
    description: 'TO REVIEW',
    accent: 'yellow',
    icon: ClipboardList,
    requiresModule: 'leaveRequests',
  },
  {
    id: 'course-review',
    title: 'Courses awaiting review',
    value: '0',
    description: 'SUBMISSIONS',
    accent: 'violet',
    icon: GraduationCap,
    requiresModule: 'courses',
  },
  {
    id: 'open-issues',
    title: 'Open issue reports',
    value: '0',
    description: 'TO RESOLVE',
    accent: 'rose',
    icon: LifeBuoy,
    requiresModule: 'issueReports',
  },
  {
    id: 'birthdays-week',
    title: 'Birthdays this week',
    value: '0',
    description: 'NEXT 7 DAYS',
    accent: 'cyan',
    icon: Cake,
    requiresModule: 'employees',
  },
  {
    id: 'payroll-cost',
    title: "Today's Payroll Cost",
    value: '$0.00',
    valueLabel: 'Actual',
    description: 'Projected: $0.00',
    accent: 'emerald',
    icon: DollarSign,
    requiresModule: 'accounting',
  },
];

export function filterKpisForModules(
  metrics: KpiMetric[],
  canAccessModule: (moduleKey: AdminModuleKey) => boolean,
): KpiMetric[] {
  return metrics.filter((metric) => {
    if (!metric.requiresModule) return true;
    return canAccessModule(metric.requiresModule);
  });
}
