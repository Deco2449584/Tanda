'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DateRange } from '@/lib/attendance/date-range';
import {
  fetchDashboardOpsMetrics,
  type DashboardOpsMetrics,
} from '@/lib/dashboard/ops-metrics-api';

const EMPTY: DashboardOpsMetrics = {
  courses: null,
  issues: null,
  inspections: null,
};

export function useDashboardOpsMetrics(dateRange: DateRange) {
  const [metrics, setMetrics] = useState<DashboardOpsMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const initialDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!initialDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const next = await fetchDashboardOpsMetrics({
        start: dateRange.start,
        end: dateRange.end,
      });
      setMetrics(next);
    } catch (error) {
      console.error('useDashboardOpsMetrics', error);
      setMetrics(EMPTY);
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialDoneRef.current = true;
    }
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    initialDoneRef.current = false;
    void refresh();
  }, [refresh]);

  return { metrics, loading, refreshing, refresh };
}
