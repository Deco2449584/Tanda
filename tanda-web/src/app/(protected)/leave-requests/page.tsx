'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { ChevronDown, Filter, Search } from 'lucide-react';
import {
  AttendanceJustificationsList,
  type JustificationView,
} from '@/components/leave-requests/AttendanceJustificationsList';
import {
  LeaveDateFilterBar,
  shiftLeaveDateRange,
  type LeaveDatePreset,
} from '@/components/leave-requests/LeaveDateFilterBar';
import { LeaveRequestsAdminTable } from '@/components/leave-requests/LeaveRequestsAdminTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { COLLECTIONS, LEAVE_REQUEST_STATUSES } from '@/lib/constants';
import {
  getCurrentMonthRange,
  getLastWeekRange,
  getTodayRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { requestOverlapsRange } from '@/lib/leave-requests/format';
import { db } from '@/lib/firebase';
import { useEmployees } from '@/providers/EmployeesProvider';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

type LeaveCenterView = 'requests' | JustificationView;

function parseViewParam(value: string | null): LeaveCenterView {
  if (value === 'lateJustifications' || value === 'late') return 'late';
  if (value === 'noShowJustifications' || value === 'no_show') return 'no_show';
  return 'requests';
}

export default function LeaveRequestsPage() {
  const { canPerformAction } = useAdminAccess();
  const canManageLeaveRequests = canPerformAction('leaveRequests', 'manage');
  const canUpdateLeaveRequests = canPerformAction('leaveRequests', 'update');
  const canDeleteLeaveRequests = canPerformAction('leaveRequests', 'delete');
  const searchParams = useSearchParams();
  const { employees, loading: employeesLoading } = useEmployees();
  const [dateRange, setDateRange] = useState<DateRange>(() => getCurrentMonthRange());
  const [datePreset, setDatePreset] = useState<LeaveDatePreset>('month');
  const [statusFilter, setStatusFilter] = useState<LeaveRequestStatus | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [centerView, setCenterView] = useState<LeaveCenterView>(() =>
    parseViewParam(searchParams.get('view')),
  );
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => {
      unsubscribeRequests();
    };
  }, []);

  useEffect(() => {
    setCenterView(parseViewParam(searchParams.get('view')));
  }, [searchParams]);

  const pageLoading = loading || employeesLoading;

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
        dateRange.start,
        dateRange.end,
      );

      return matchesStatus && matchesDate;
    });
  }, [dateRange.end, dateRange.start, requests, statusFilter]);

  function handlePresetChange(preset: LeaveDatePreset) {
    setDatePreset(preset);

    if (preset === 'today') {
      setDateRange(getTodayRange());
    } else if (preset === 'lastWeek') {
      setDateRange(getLastWeekRange());
    } else if (preset === 'month') {
      setDateRange(getCurrentMonthRange());
    }
  }

  function handleRangeChange(range: DateRange) {
    setDateRange(range);
    setDatePreset('custom');
  }

  function handleStepDateRange(direction: -1 | 1) {
    setDateRange(shiftLeaveDateRange(dateRange, datePreset, direction));
  }

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Leave requests center"
        description={
          centerView === 'requests'
            ? 'Review and approve staff leave requests.'
            : centerView === 'late'
              ? 'Read-only list of late arrival justifications.'
              : 'Read-only list of no-show explanations.'
        }
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <LeaveDateFilterBar
          dateRange={dateRange}
          activePreset={datePreset}
          onPresetChange={handlePresetChange}
          onRangeChange={handleRangeChange}
          onStepRange={handleStepDateRange}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px]">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
              aria-hidden
            />
            <select
              value={centerView}
              onChange={(e) => setCenterView(e.target.value as LeaveCenterView)}
              className="w-full appearance-none rounded-lg border border-primary/30 bg-surface-raised py-2.5 pl-10 pr-9 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
              aria-label="Filter record type"
            >
              <option value="requests" className="bg-surface-raised">
                Leave requests
              </option>
              <option value="late" className="bg-surface-raised">
                Late justifications
              </option>
              <option value="no_show" className="bg-surface-raised">
                No-show justifications
              </option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
          </div>

          {centerView === 'requests' ? (
            <div className="relative min-w-[180px]">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                aria-hidden
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as LeaveRequestStatus | 'all')
                }
                className="w-full appearance-none rounded-lg border border-primary/30 bg-surface-raised py-2.5 pl-10 pr-9 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/30"
                aria-label="Filter by status"
              >
                <option value="all" className="bg-surface-raised">
                  All statuses
                </option>
                {LEAVE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-surface-raised">
                    {status}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
          ) : null}

          <div className="relative w-full sm:min-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {centerView === 'requests' ? (
        <LeaveRequestsAdminTable
          requests={filteredRequests}
          employeesByCode={employeesByCode}
          loading={pageLoading}
          searchQuery={searchQuery}
          canManage={canManageLeaveRequests}
          canUpdate={canUpdateLeaveRequests}
          canDelete={canDeleteLeaveRequests}
        />
      ) : (
        <AttendanceJustificationsList
          view={centerView}
          dateRange={dateRange}
          employeesByCode={employeesByCode}
          searchQuery={searchQuery}
        />
      )}
    </PageContent>
  );
}
