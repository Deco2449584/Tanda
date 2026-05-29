'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ShiftLoadChart } from '@/components/dashboard/ShiftLoadChart';
import { WeeklyHoursChart } from '@/components/dashboard/WeeklyHoursChart';
import type { KpiMetric } from '@/components/dashboard/mock-data';
import { kpiMetrics as staticKpiMetrics } from '@/components/dashboard/mock-data';
import { COLLECTIONS } from '@/lib/constants';
import {
  computeActiveStaffKpi,
  computePayrollKpi,
} from '@/lib/employees/dashboard-kpis';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

const FIRESTORE_KPI_IDS = ['active-staff', 'payroll-cost'] as const;

export default function DashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setKpisLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapEmployeeDoc(document.id, document.data()),
        );
        setEmployees(mapped);
        setKpisLoading(false);
      },
      () => {
        setKpisLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const metrics: KpiMetric[] = useMemo(() => {
    const activeStaff = computeActiveStaffKpi(employees);
    const payroll = computePayrollKpi(employees);

    return staticKpiMetrics.map((metric) => {
      if (metric.id === 'active-staff') {
        return {
          ...metric,
          value: activeStaff.label,
          description: 'Empleados en Turno',
        };
      }

      if (metric.id === 'payroll-cost') {
        return {
          ...metric,
          value: payroll.formatted,
        };
      }

      return metric;
    });
  }, [employees]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Panel de control general
      </h1>

      <KpiGrid
        metrics={metrics}
        loadingIds={kpisLoading ? [...FIRESTORE_KPI_IDS] : []}
      />

      <WeeklyHoursChart />

      <ShiftLoadChart />
    </div>
  );
}
