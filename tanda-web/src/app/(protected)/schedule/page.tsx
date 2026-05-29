'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { AssignShiftModal } from '@/components/schedule/AssignShiftModal';
import { AvailableEmployeesPanel } from '@/components/schedule/AvailableEmployeesPanel';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { WeekRangePicker } from '@/components/schedule/WeekRangePicker';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { buildWeekRange } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { AssignShiftInput, Shift } from '@/lib/types/shift';

type ViewMode = 'weekly' | 'monthly';

export default function SchedulePage() {
  const [weekReference, setWeekReference] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState<AssignShiftInput | null>(null);

  const week = useMemo(() => buildWeekRange(weekReference), [weekReference]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let employeesReady = false;
    let shiftsReady = false;

    function checkReady() {
      if (employeesReady && shiftsReady) {
        setLoading(false);
      }
    }

    const unsubscribeEmployees = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs
          .map((document) => mapEmployeeDoc(document.id, document.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        setEmployees(mapped);
        employeesReady = true;
        checkReady();
      },
      () => {
        employeesReady = true;
        checkReady();
      },
    );

    const shiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('date', '>=', week.start),
      where('date', '<=', week.end),
      orderBy('date', 'asc'),
    );

    const unsubscribeShifts = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapShiftDoc(document.id, document.data()),
        );
        setShifts(mapped);
        shiftsReady = true;
        checkReady();
      },
      () => {
        shiftsReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeShifts();
    };
  }, [week.start, week.end]);

  const departments = useMemo(() => {
    const unique = new Set(
      employees.map((employee) => employee.department).filter(Boolean),
    );
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [employees]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.active),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const base =
      departmentFilter === 'all'
        ? activeEmployees
        : activeEmployees.filter(
            (employee) => employee.department === departmentFilter,
          );

    return base;
  }, [activeEmployees, departmentFilter]);

  function handleCellClick(employee: Employee, date: string) {
    setAssignData({
      employeeId: employee.employeeId,
      employeeName: employee.name,
      date,
      startTime: '09:00',
      endTime: '17:00',
      department: employee.department,
    });
    setAssignModalOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Planificación y horarios (Agenda)
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <WeekRangePicker
          referenceDate={weekReference}
          onChange={setWeekReference}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mensual
            </button>
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-600/50"
            aria-label="Filtrar por departamento"
          >
            {departments.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'Todos los departamentos' : department}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'monthly' && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2 text-xs text-zinc-500">
          Vista mensual en desarrollo. Mostrando agenda semanal por ahora.
        </p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <ScheduleGrid
          employees={filteredEmployees}
          shifts={shifts}
          weekDays={week.days}
          loading={loading}
          onCellClick={handleCellClick}
        />

        <AvailableEmployeesPanel employees={activeEmployees} />
      </div>

      <AssignShiftModal
        open={assignModalOpen}
        initialData={assignData}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignData(null);
        }}
      />
    </div>
  );
}
