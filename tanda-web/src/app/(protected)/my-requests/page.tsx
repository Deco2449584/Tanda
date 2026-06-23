'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { LeaveRequestHistoryTable } from '@/components/leave-requests/LeaveRequestHistoryTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
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

  useEffect(() => {
    if (!db || !employee?.employeeId) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    setRequestsLoading(true);

    const requestsQuery = query(
      collection(db, COLLECTIONS.LEAVE_REQUESTS),
      where('employeeId', '==', employee.employeeId),
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((document) => mapLeaveRequestDoc(document.id, document.data()))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis() ?? 0;
            const bTime = b.createdAt?.toMillis() ?? 0;
            return bTime - aTime;
          });
        setRequests(mapped);
        setRequestsLoading(false);
      },
      () => {
        setRequests([]);
        setRequestsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [employee?.employeeId]);

  const loading = authLoading || employeeLoading;

  const formDisabled = useMemo(
    () => loading || !employee?.employeeId || Boolean(employeeError),
    [loading, employee?.employeeId, employeeError],
  );

  return (
    <PageContent className="space-y-6">
      <PageHeader title="My leave" />

      {employeeError && !loading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <NewLeaveRequestForm
          employeeId={employee?.employeeId ?? ''}
          disabled={formDisabled}
        />

        <LeaveRequestHistoryTable
          requests={requests}
          loading={loading || requestsLoading}
        />
      </div>
    </PageContent>
  );
}
