'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ShiftLoadChart } from '@/components/dashboard/ShiftLoadChart';
import { WeeklyHoursChart } from '@/components/dashboard/WeeklyHoursChart';
import { baseKpiMetrics } from '@/lib/dashboard/kpi-definitions';
import type { KpiMetric } from '@/lib/dashboard/types';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import { COLLECTIONS } from '@/lib/constants';
import {
  computeActiveStaffKpi,
  computeDualPayrollKpi,
} from '@/lib/employees/dashboard-kpis';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const {
    pendingPermits,
    lateAlerts,
    shiftLoadData,
    weeklyHoursData,
    todayShifts,
    todayAttendance,
    loading: dashboardLoading,
  } = useAdminDashboardData();

  useEffect(() => {
    if (!db) {
      setEmployeesLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapEmployeeDoc(document.id, document.data()),
        );
        setEmployees(mapped);
        setEmployeesLoading(false);
      },
      () => {
        setEmployeesLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const metrics: KpiMetric[] = useMemo(() => {
    const activeStaff = computeActiveStaffKpi(employees);
    const payroll = computeDualPayrollKpi(
      employees,
      todayShifts,
      todayAttendance,
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
  }, [employees, lateAlerts, pendingPermits, todayAttendance, todayShifts]);

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
