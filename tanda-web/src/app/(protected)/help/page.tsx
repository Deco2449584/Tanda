'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpTutorialsViewer } from '@/components/help/HelpTutorialsViewer';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { fetchHelpTutorials } from '@/lib/help/help-tutorials-api';
import type { SerializedHelpTutorial } from '@/lib/help/help-tutorials-api';

export default function HelpPage() {
  const [tutorials, setTutorials] = useState<SerializedHelpTutorial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadTutorials = useCallback(async () => {
    setLoading(true);
    try {
      const { tutorials: items, categories: nextCategories } =
        await fetchHelpTutorials();
      setTutorials(items);
      setCategories(nextCategories);
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

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Help & tutorials"
        description="Video guides matched to your role, department and location."
      />

      <HelpTutorialsViewer
        tutorials={tutorials}
        categories={categories}
        loading={loading}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
