'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Paperclip,
  Play,
  Video,
} from 'lucide-react';
import type { SerializedHelpTutorial } from '@/lib/help/help-tutorials-api';
import { resolveHelpTutorialCategories } from '@/lib/help/help-tutorial-categories';
import { resolveHelpTutorialPrimaryUrl } from '@/lib/help/map-help-tutorial';
import {
  HELP_RESOURCE_KIND_LABELS,
  type HelpResourceKind,
  type HelpTutorialAttachment,
} from '@/lib/types/help-tutorial';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { isFirebaseStorageUrl } from '@/utils/imageOptimizer';

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const KIND_ICONS: Record<HelpResourceKind, typeof Play> = {
  video: Play,
  pdf: FileText,
  document: FileText,
  image: ImageIcon,
  link: Link2,
};

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
        Loading guides…
      </div>
    );
  }

  if (tutorials.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        No help guides available for your profile yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTutorial ? (
        <GuideDetail tutorial={activeTutorial} />
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
                const kind = (tutorial.kind ?? 'video') as HelpResourceKind;
                const Icon = KIND_ICONS[kind] ?? Play;
                const duration = formatDuration(tutorial.durationSeconds);
                const extraCount = Math.max(0, (tutorial.attachments?.length ?? 0) - 1);

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
                        <Icon className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{tutorial.title}</span>
                      </span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                        {HELP_RESOURCE_KIND_LABELS[kind]}
                        {extraCount > 0 ? ` · +${extraCount} files` : ''}
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

function GuideDetail({ tutorial }: { tutorial: SerializedHelpTutorial }) {
  const kind = (tutorial.kind ?? 'video') as HelpResourceKind;
  const primaryUrl = resolveHelpTutorialPrimaryUrl(tutorial);
  const attachments = tutorial.attachments ?? [];
  const secondary = attachments.filter((item, index) => {
    if (index === 0 && item.url === primaryUrl) return false;
    return true;
  });

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
            {HELP_RESOURCE_KIND_LABELS[kind]}
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-foreground">
            {tutorial.title}
          </h2>
          {tutorial.description ? (
            <p className="mt-1 text-sm text-muted">{tutorial.description}</p>
          ) : null}
        </div>
        {kind === 'link' && primaryUrl ? (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open link
          </a>
        ) : null}
      </div>

      <div className="mt-4">
        <PrimaryResource tutorial={tutorial} kind={kind} url={primaryUrl} />
      </div>

      {secondary.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Paperclip className="h-3.5 w-3.5" />
            Attachments
          </p>
          <ul className="space-y-2">
            {secondary.map((attachment) => (
              <AttachmentRow key={attachment.id} attachment={attachment} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function PrimaryResource({
  tutorial,
  kind,
  url,
}: {
  tutorial: SerializedHelpTutorial;
  kind: HelpResourceKind;
  url: string;
}) {
  if (!url) {
    return (
      <p className="rounded-xl border border-border bg-surface-base px-4 py-6 text-center text-sm text-muted">
        No file available for this guide.
      </p>
    );
  }

  if (kind === 'video') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-black">
        <video
          key={tutorial.id}
          src={url}
          controls
          playsInline
          className="aspect-video w-full"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (kind === 'pdf') {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-base">
          <iframe
            title={tutorial.title}
            src={url}
            className="h-[32rem] w-full bg-white"
          />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          Open / download PDF
        </a>
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-surface-base p-2">
        {isFirebaseStorageUrl(url) ? (
          <FirebaseImage
            src={url}
            alt={tutorial.title}
            width={1200}
            height={800}
            className="mx-auto h-auto max-h-[32rem] w-full object-contain"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={tutorial.title}
            className="mx-auto h-auto max-h-[32rem] w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    );
  }

  if (kind === 'link') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface-base px-4 py-4 transition hover:border-primary/40"
      >
        <Link2 className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Open external guide</p>
          <p className="truncate text-xs text-muted">{url}</p>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-subtle" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={tutorial.fileName}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface-base px-4 py-4 transition hover:border-primary/40"
    >
      <FileText className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {tutorial.fileName || 'Download document'}
        </p>
        <p className="text-xs text-muted">
          {[tutorial.contentType, formatBytes(tutorial.sizeBytes)]
            .filter(Boolean)
            .join(' · ') || 'Document attachment'}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-subtle" />
    </a>
  );
}

function AttachmentRow({ attachment }: { attachment: HelpTutorialAttachment }) {
  const Icon = KIND_ICONS[attachment.kind] ?? Paperclip;

  return (
    <li>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg border border-border bg-surface-base px-3 py-2.5 transition hover:border-border-strong"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {attachment.fileName ||
              HELP_RESOURCE_KIND_LABELS[attachment.kind] ||
              'Attachment'}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-subtle">
            {HELP_RESOURCE_KIND_LABELS[attachment.kind]}
            {attachment.sizeBytes ? ` · ${formatBytes(attachment.sizeBytes)}` : ''}
          </p>
        </div>
        {attachment.kind === 'link' ? (
          <ExternalLink className="h-3.5 w-3.5 text-subtle" />
        ) : attachment.kind === 'video' ? (
          <Video className="h-3.5 w-3.5 text-subtle" />
        ) : (
          <Download className="h-3.5 w-3.5 text-subtle" />
        )}
      </a>
    </li>
  );
}
