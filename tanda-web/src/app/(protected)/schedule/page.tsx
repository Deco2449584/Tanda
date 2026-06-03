'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { Building2, ChevronDown } from 'lucide-react';
import { AssignShiftModal } from '@/components/schedule/AssignShiftModal';
import { AvailableEmployeesPanel } from '@/components/schedule/AvailableEmployeesPanel';
import { MonthRangePicker } from '@/components/schedule/MonthRangePicker';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { ScheduleMonthCalendar } from '@/components/schedule/ScheduleMonthCalendar';
import { WeekRangePicker } from '@/components/schedule/WeekRangePicker';
import { COLLECTIONS } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { buildMonthCalendar } from '@/lib/schedule/month';
import { buildWeekRange } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { AssignShiftInput, Shift } from '@/lib/types/shift';

type ViewMode = 'weekly' | 'monthly';

export default function SchedulePage() {
  const [weekReference, setWeekReference] = useState(() => new Date());
  const [monthReference, setMonthReference] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState<AssignShiftInput | null>(null);

  const week = useMemo(() => buildWeekRange(weekReference), [weekReference]);
  const month = useMemo(() => buildMonthCalendar(monthReference), [monthReference]);

  const rangeStart = viewMode === 'weekly' ? week.start : month.start;
  const rangeEnd = viewMode === 'weekly' ? week.end : month.end;

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
          .sort((a, b) => a.name.localeCompare(b.name, 'en'));
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
      where('date', '>=', rangeStart),
      where('date', '<=', rangeEnd),
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
  }, [rangeEnd, rangeStart]);

  const departments = useMemo(() => {
    const unique = new Set(
      employees.map((employee) => employee.department).filter(Boolean),
    );
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b, 'en'))];
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

  const filteredShifts = useMemo(() => {
    if (departmentFilter === 'all') return shifts;

    const allowedIds = new Set(
      filteredEmployees.map((employee) => employee.employeeId),
    );

    return shifts.filter((shift) => allowedIds.has(shift.employeeId));
  }, [departmentFilter, filteredEmployees, shifts]);

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

  function handleMonthDayClick(date: string) {
    const first = filteredEmployees[0];
    setAssignData({
      employeeId: first?.employeeId ?? '',
      employeeName: first?.name ?? '',
      date,
      startTime: '09:00',
      endTime: '17:00',
      department: first?.department ?? '',
    });
    setAssignModalOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Scheduling and rosters (Agenda)
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {viewMode === 'weekly' ? (
          <WeekRangePicker
            referenceDate={weekReference}
            onChange={setWeekReference}
          />
        ) : (
          <MonthRangePicker
            referenceDate={monthReference}
            label={month.label}
            onChange={setMonthReference}
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              Monthly
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Building2
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-primary/30 bg-zinc-900 py-2.5 pl-10 pr-9 text-sm font-medium text-white shadow-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
              aria-label="Filter by department"
            >
              {departments.map((department) => (
                <option key={department} value={department} className="bg-zinc-900">
                  {department === 'all' ? 'All departments' : department}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 gap-4 ${
          viewMode === 'weekly' ? 'xl:grid-cols-[minmax(0,1fr)_240px]' : ''
        }`}
      >
        {viewMode === 'weekly' ? (
          <ScheduleGrid
            employees={filteredEmployees}
            shifts={filteredShifts}
            weekDays={week.days}
            loading={loading}
            onCellClick={handleCellClick}
          />
        ) : (
          <ScheduleMonthCalendar
            days={month.days}
            shifts={filteredShifts}
            loading={loading}
            monthLabel={month.label}
            onDayClick={handleMonthDayClick}
          />
        )}

        {viewMode === 'weekly' && (
          <AvailableEmployeesPanel employees={activeEmployees} />
        )}
      </div>

      <AssignShiftModal
        open={assignModalOpen}
        initialData={assignData}
        employees={filteredEmployees}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignData(null);
        }}
      />
    </div>
  );
}
