'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpTutorialManagePanel } from '@/components/help/HelpTutorialManagePanel';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { fetchHelpTutorialsAdmin } from '@/lib/help/help-tutorials-api';
import type { SerializedHelpTutorial } from '@/lib/help/help-tutorials-api';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';

export default function HelpTutorialsAdminPage() {
  const { employees, loading: employeesLoading } = useEmployees();
  const { locations, loading: locationsLoading } = useLocations();
  const [tutorials, setTutorials] = useState<SerializedHelpTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadTutorials = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchHelpTutorialsAdmin();
      setTutorials(items);
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        text: error instanceof Error ? error.message : 'Could not load tutorials.',
        variant: 'error',
      });
      setTutorials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTutorials();
  }, [loadTutorials]);

  const pageLoading = employeesLoading || locationsLoading;

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Help tutorials"
        description="Upload and categorize training videos for employees and admins."
      />

      {pageLoading ? (
        <LoadingIndicator message="Loading employees and locations…" />
      ) : (
        <HelpTutorialManagePanel
          tutorials={tutorials}
          employees={employees}
          locations={locations}
          loading={loading}
          onChanged={() => {
            setToast({
              id: crypto.randomUUID(),
              text: 'Tutorial saved.',
              variant: 'success',
            });
            void loadTutorials();
          }}
          onError={(message) => {
            setToast({
              id: crypto.randomUUID(),
              text: message,
              variant: 'error',
            });
          }}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
