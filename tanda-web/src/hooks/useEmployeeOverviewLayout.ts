'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadEmployeeOverviewLayout,
  saveEmployeeOverviewLayout,
  type EmployeeOverviewLayoutState,
  type EmployeeOverviewSectionId,
} from '@/lib/employee-dashboard/employee-overview-layout';

export function useEmployeeOverviewLayout() {
  const [layout, setLayout] = useState<EmployeeOverviewLayoutState>(() =>
    loadEmployeeOverviewLayout(),
  );

  useEffect(() => {
    setLayout(loadEmployeeOverviewLayout());
  }, []);

  const persist = useCallback((next: EmployeeOverviewLayoutState) => {
    setLayout(next);
    saveEmployeeOverviewLayout(next);
  }, []);

  const toggleSectionCollapsed = useCallback(
    (sectionId: EmployeeOverviewSectionId) => {
      const isCollapsed = layout.collapsedSections.includes(sectionId);
      const collapsedSections = isCollapsed
        ? layout.collapsedSections.filter((id) => id !== sectionId)
        : [...layout.collapsedSections, sectionId];

      persist({ collapsedSections });
    },
    [layout.collapsedSections, persist],
  );

  const isSectionCollapsed = useCallback(
    (sectionId: EmployeeOverviewSectionId) =>
      layout.collapsedSections.includes(sectionId),
    [layout.collapsedSections],
  );

  return {
    isSectionCollapsed,
    toggleSectionCollapsed,
  };
}
