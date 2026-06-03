'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { Search } from 'lucide-react';
import { LeaveRequestsAdminTable } from '@/components/leave-requests/LeaveRequestsAdminTable';
import { WeekRangePicker } from '@/components/schedule/WeekRangePicker';
import { COLLECTIONS, LEAVE_REQUEST_STATUSES } from '@/lib/constants';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { db } from '@/lib/firebase';
import { requestOverlapsRange } from '@/lib/leave-requests/format';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { buildWeekRange } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

export default function LeaveRequestsPage() {
  const [weekReference, setWeekReference] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const week = useMemo(() => buildWeekRange(weekReference), [weekReference]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let employeesReady = false;
    let requestsReady = false;

    function checkReady() {
      if (employeesReady && requestsReady) {
        setLoading(false);
      }
    }

    const unsubscribeEmployees = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        setEmployees(
          snapshot.docs.map((document) =>
            mapEmployeeDoc(document.id, document.data()),
          ),
        );
        employeesReady = true;
        checkReady();
      },
      () => {
        employeesReady = true;
        checkReady();
      },
    );

    const requestsQuery = query(
      collection(db, COLLECTIONS.LEAVE_REQUESTS),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribeRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRequests(
          snapshot.docs.map((document) =>
            mapLeaveRequestDoc(document.id, document.data()),
          ),
        );
        requestsReady = true;
        checkReady();
      },
      () => {
        requestsReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeRequests();
    };
  }, []);

  const employeesByCode = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((employee) => {
      if (employee.employeeId) {
        map[employee.employeeId] = employee;
      }
    });
    return map;
  }, [employees]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === 'all' || request.status === statusFilter;

      const matchesDate = requestOverlapsRange(
        request.startDate,
        request.endDate,
        week.start,
        week.end,
      );

      return matchesStatus && matchesDate;
    });
  }, [requests, statusFilter, week.start, week.end]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Leave requests center
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <WeekRangePicker
          referenceDate={weekReference}
          onChange={setWeekReference}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as LeaveRequestStatus | 'all')
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-primary/50"
            aria-label="Filter by status"
          >
            <option value="all">Status: All</option>
            {LEAVE_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:min-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <LeaveRequestsAdminTable
        requests={filteredRequests}
        employeesByCode={employeesByCode}
        loading={loading}
        searchQuery={searchQuery}
      />
    </div>
  );
}
