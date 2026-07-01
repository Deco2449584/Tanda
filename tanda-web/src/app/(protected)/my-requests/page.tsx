'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LeaveRequestHistoryTable } from '@/components/leave-requests/LeaveRequestHistoryTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { NewLeaveRequestForm } from '@/components/leave-requests/NewLeaveRequestForm';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { COLLECTIONS } from '@/lib/constants';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { db } from '@/lib/firebase';
import type { LeaveRequest } from '@/lib/types/leave-request';

export default function MyRequestsPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const loadRequests = useCallback(async () => {
    if (!db || !employee?.employeeId) {
      setRequests([]);
      setRequestsLoading(false);
      initialLoadDoneRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current) {
      setRequestsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.LEAVE_REQUESTS),
          where('employeeId', '==', employee.employeeId),
        ),
      );
      const mapped = snapshot.docs
        .map((document) => mapLeaveRequestDoc(document.id, document.data()))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis() ?? 0;
          const bTime = b.createdAt?.toMillis() ?? 0;
          return bTime - aTime;
        });
      setRequests(mapped);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [employee?.employeeId]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void loadRequests();
  }, [loadRequests]);

  const loading = authLoading || employeeLoading;

  const formDisabled = useMemo(
    () => loading || !employee?.employeeId || Boolean(employeeError),
    [loading, employee?.employeeId, employeeError],
  );

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="My leave"
        actions={
          <RefreshButton
            onClick={loadRequests}
            refreshing={refreshing}
            disabled={loading || requestsLoading}
          />
        }
      />

      {employeeError && !loading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <NewLeaveRequestForm
          employeeId={employee?.employeeId ?? ''}
          disabled={formDisabled}
          onSubmitted={() => void loadRequests()}
        />

        <LeaveRequestHistoryTable
          requests={requests}
          loading={loading || requestsLoading}
        />
      </div>
    </PageContent>
  );
}
