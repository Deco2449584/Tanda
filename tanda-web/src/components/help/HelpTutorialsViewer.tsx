'use client';

import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { SerializedHelpTutorial } from '@/lib/help/help-tutorials-api';
import { resolveHelpTutorialCategories } from '@/lib/help/help-tutorial-categories';

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface HelpTutorialsViewerProps {
  tutorials: SerializedHelpTutorial[];
  categories: string[];
  loading?: boolean;
}

export function HelpTutorialsViewer({
  tutorials,
  categories,
  loading,
}: HelpTutorialsViewerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const orderedCategories = useMemo(
    () =>
      resolveHelpTutorialCategories(
        categories,
        tutorials.map((tutorial) => tutorial.category),
      ),
    [categories, tutorials],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, SerializedHelpTutorial[]>();
    for (const category of orderedCategories) {
      map.set(category, []);
    }
    for (const tutorial of tutorials) {
      const list = map.get(tutorial.category) ?? [];
      list.push(tutorial);
      map.set(tutorial.category, list);
    }
    for (const [category, list] of map) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      map.set(category, list);
    }
    return map;
  }, [orderedCategories, tutorials]);

  const activeTutorial = tutorials.find((item) => item.id === activeId) ?? null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        Loading tutorials…
      </div>
    );
  }

  if (tutorials.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        No tutorials available for your profile yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTutorial ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-4 md:p-5">
          <h2 className="truncate text-base font-semibold text-foreground">{activeTutorial.title}</h2>
          {activeTutorial.description ? (
            <p className="mt-1 line-clamp-3 text-sm text-muted">{activeTutorial.description}</p>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-black">
            <video
              key={activeTutorial.id}
              src={activeTutorial.videoUrl}
              controls
              playsInline
              className="aspect-video w-full"
            >
              Your browser does not support video playback.
            </video>
          </div>
        </section>
      ) : null}

      {orderedCategories.map((category) => {
        const items = grouped.get(category) ?? [];
        if (items.length === 0) return null;

        return (
          <section key={category}>
            <h3 className="mb-3 truncate text-xs font-semibold uppercase tracking-wider text-subtle">
              {category}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tutorial) => {
                const isActive = activeId === tutorial.id;
                const duration = formatDuration(tutorial.durationSeconds);

                return (
                  <li key={tutorial.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(tutorial.id)}
                      className={`flex w-full flex-col rounded-xl border p-4 text-left transition ${
                        isActive
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-surface-raised hover:border-border-strong'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                        <Play className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{tutorial.title}</span>
                      </span>
                      {tutorial.description ? (
                        <span className="mt-1 line-clamp-2 text-xs text-muted">
                          {tutorial.description}
                        </span>
                      ) : null}
                      {duration ? (
                        <span className="mt-2 text-[10px] font-medium uppercase tracking-wide text-subtle">
                          {duration}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
