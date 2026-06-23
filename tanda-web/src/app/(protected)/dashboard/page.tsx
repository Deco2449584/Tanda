'use client';

import { useMemo } from 'react';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ShiftLoadChart } from '@/components/dashboard/ShiftLoadChart';
import { WeeklyHoursChart } from '@/components/dashboard/WeeklyHoursChart';
import { baseKpiMetrics } from '@/lib/dashboard/kpi-definitions';
import type { KpiMetric } from '@/lib/dashboard/types';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import {
  computeActiveStaffKpi,
  computeDualPayrollKpi,
} from '@/lib/employees/dashboard-kpis';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';

export default function DashboardPage() {
  const { employees, loading: employeesLoading } = useEmployees();
  const { settings } = useCompanySettings();

  const {
    pendingPermits,
    lateAlerts,
    shiftLoadData,
    weeklyHoursData,
    todayShifts,
    todayAttendance,
    loading: dashboardLoading,
  } = useAdminDashboardData();

  const metrics: KpiMetric[] = useMemo(() => {
    const activeStaff = computeActiveStaffKpi(employees);
    const payroll = computeDualPayrollKpi(
      employees,
      todayShifts,
      todayAttendance,
      settings.attendanceBreak,
    );

    return baseKpiMetrics.map((metric) => {
      if (metric.id === 'active-staff') {
        return {
          ...metric,
          value: activeStaff.label,
          description: 'Employees on Shift',
        };
      }

      if (metric.id === 'payroll-cost') {
        return {
          ...metric,
          value: payroll.actual.formatted,
          valueLabel: 'Actual',
          description: `Projected: ${payroll.projected.formatted}`,
        };
      }

      if (metric.id === 'late-alerts') {
        return {
          ...metric,
          value: String(lateAlerts),
        };
      }

      if (metric.id === 'pending-permits') {
        return {
          ...metric,
          value: String(pendingPermits),
        };
      }

      return metric;
    });
  }, [employees, lateAlerts, pendingPermits, settings.attendanceBreak, todayAttendance, todayShifts]);

  const loadingIds = useMemo(() => {
    const ids: string[] = [];
    if (employeesLoading) {
      ids.push('active-staff');
    }
    if (
      employeesLoading ||
      dashboardLoading.shifts ||
      dashboardLoading.attendance
    ) {
      ids.push('payroll-cost');
    }
    if (dashboardLoading.leaveRequests) {
      ids.push('pending-permits');
    }
    if (dashboardLoading.shifts || dashboardLoading.attendance) {
      ids.push('late-alerts');
    }
    return ids;
  }, [dashboardLoading, employeesLoading]);

  const chartsLoading = dashboardLoading.shifts;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        General control panel
      </h1>

      <KpiGrid metrics={metrics} loadingIds={loadingIds} />

      <WeeklyHoursChart data={weeklyHoursData} loading={chartsLoading} />

      <ShiftLoadChart data={shiftLoadData} loading={chartsLoading} />
    </div>
  );
}
