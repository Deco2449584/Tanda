'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { AddManualAttendanceForm } from '@/components/attendance/AddManualAttendanceForm';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';
import type { AttendanceRecord } from '@/lib/types/attendance';

export default function ManualAttendancePage() {
  const router = useRouter();
  const { loading: accessLoading, canAccessModule, canPerformAction } =
    useAdminAccess();
  const canCreate = canPerformAction('attendance', 'create');
  const { employees, loading: employeesLoading } = useEmployees();
  const { locations, loading: locationsLoading } = useLocations();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    if (accessLoading) return;
    if (!canAccessModule('attendance') || !canCreate) {
      router.replace('/attendance');
    }
  }, [accessLoading, canAccessModule, canCreate, router]);

  useEffect(() => {
    if (!db) {
      setRecordsLoading(false);
      return;
    }

    const start = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = Timestamp.fromMillis(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const recordsQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(5000),
    );

    const unsubscribe = onSnapshot(
      recordsQuery,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        );
        setRecordsLoading(false);
      },
      (error) => {
        console.error('Manual attendance records listener failed:', error);
        setRecordsLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  if (
    accessLoading ||
    !canCreate ||
    employeesLoading ||
    locationsLoading ||
    recordsLoading
  ) {
    return (
      <PageContent>
        <LoadingIndicator message="Loading…" />
      </PageContent>
    );
  }

  return (
    <PageContent className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="space-y-4">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to attendance
        </Link>

        <PageHeader
          eyebrow="Attendance"
          eyebrowIcon={Clock3}
          title="Add manual attendance"
          description="Create check-in, check-out, and break punches for one or more weekdays. Manual entries have no photo evidence."
        />
      </div>

      <AddManualAttendanceForm
        employees={employees}
        locations={locations}
        allRecords={records}
        onCancel={() => router.push('/attendance')}
        onSuccess={() => router.push('/attendance')}
      />
    </PageContent>
  );
}
