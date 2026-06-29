'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import { Loader2, Trash2, Upload, Video } from 'lucide-react';
import {
  createHelpTutorialRequest,
  deleteHelpTutorialRequest,
  updateHelpTutorialRequest,
  type SerializedHelpTutorial,
} from '@/lib/help/help-tutorials-api';
import { uploadTutorialVideo } from '@/lib/media/storage-uploads';
import {
  HELP_TUTORIAL_AUDIENCES,
  HELP_TUTORIAL_CATEGORIES,
  HELP_TUTORIAL_USER_ROLES,
  type HelpTutorialAudience,
  type HelpTutorialCategory,
  type HelpTutorialUserRole,
} from '@/lib/types/help-tutorial';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import { useDepartments } from '@/providers/DepartmentsProvider';

interface HelpTutorialManagePanelProps {
  tutorials: SerializedHelpTutorial[];
  employees: Employee[];
  locations: Location[];
  loading?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

const AUDIENCE_LABELS: Record<HelpTutorialAudience, string> = {
  all: 'Everyone',
  userRole: 'By user role',
  department: 'By department',
  location: 'By location',
};

export function HelpTutorialManagePanel({
  tutorials,
  employees,
  locations,
  loading,
  onChanged,
  onError,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: HelpTutorialManagePanelProps) {
  const { departmentNames } = useDepartments();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HelpTutorialCategory>(HELP_TUTORIAL_CATEGORIES[0]);
  const [audience, setAudience] = useState<HelpTutorialAudience>('all');
  const [audienceValue, setAudienceValue] = useState('');
  const [audienceRoles, setAudienceRoles] = useState<HelpTutorialUserRole[]>(['empleado']);
  const [sortOrder, setSortOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const values = new Set(departmentNames);
    employees.forEach((employee) => {
      const department = employee.department?.trim();
      if (department) values.add(department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [departmentNames, employees]);

  function toggleRole(role: HelpTutorialUserRole) {
    setAudienceRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      onError('Title is required.');
      return;
    }

    if (!videoFile) {
      onError('Select a video file to upload.');
      return;
    }

    if (audience === 'department' && !audienceValue.trim()) {
      onError('Select a department.');
      return;
    }

    if (audience === 'location' && !audienceValue.trim()) {
      onError('Select a location.');
      return;
    }

    if (audience === 'userRole' && audienceRoles.length === 0) {
      onError('Select at least one role.');
      return;
    }

    setSaving(true);

    try {
      const tutorialId = crypto.randomUUID();
      const contentType = videoFile.type || 'video/mp4';
      const { videoUrl, videoPath } = await uploadTutorialVideo(
        tutorialId,
        videoFile,
        contentType,
      );

      let durationSeconds: number | undefined;
      try {
        durationSeconds = await readVideoDuration(videoFile);
      } catch {
        durationSeconds = undefined;
      }

      await createHelpTutorialRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        audience,
        audienceValue: audience === 'department' || audience === 'location' ? audienceValue.trim() : undefined,
        audienceRoles: audience === 'userRole' ? audienceRoles : undefined,
        videoUrl,
        videoPath,
        sortOrder,
        published,
        durationSeconds,
      });

      setTitle('');
      setDescription('');
      setCategory(HELP_TUTORIAL_CATEGORIES[0]);
      setAudience('all');
      setAudienceValue('');
      setAudienceRoles(['empleado']);
      setSortOrder(0);
      setPublished(true);
      setVideoFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save tutorial.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished(tutorial: SerializedHelpTutorial) {
    try {
      await updateHelpTutorialRequest(tutorial.id, { published: !tutorial.published });
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update tutorial.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this tutorial? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      await deleteHelpTutorialRequest(id);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete tutorial.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {canCreate ? (
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5 md:p-6"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">Upload tutorial</h2>
          <p className="mt-1 text-xs text-subtle">
            Videos are categorized and shown only to the matching audience.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              disabled={saving}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
            <textarea
              rows={2}
              value={description}
              disabled={saving}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Category</label>
            <select
              value={category}
              disabled={saving}
              onChange={(event) => setCategory(event.target.value as HelpTutorialCategory)}
              className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {HELP_TUTORIAL_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Sort order</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              disabled={saving}
              onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
              className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">Audience</label>
            <select
              value={audience}
              disabled={saving}
              onChange={(event) => {
                setAudience(event.target.value as HelpTutorialAudience);
                setAudienceValue('');
              }}
              className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {HELP_TUTORIAL_AUDIENCES.map((item) => (
                <option key={item} value={item}>
                  {AUDIENCE_LABELS[item]}
                </option>
              ))}
            </select>
          </div>

          {audience === 'department' ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Department</label>
              <select
                value={audienceValue}
                disabled={saving}
                onChange={(event) => setAudienceValue(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Select…</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {audience === 'location' ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Location</label>
              <select
                value={audienceValue}
                disabled={saving}
                onChange={(event) => setAudienceValue(event.target.value)}
                className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Select…</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {audience === 'userRole' ? (
            <div className="md:col-span-2">
              <p className="mb-2 text-xs font-medium text-muted">Roles</p>
              <div className="flex flex-wrap gap-3">
                {HELP_TUTORIAL_USER_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={audienceRoles.includes(role)}
                      disabled={saving}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted">Video (max 100 MB)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-xs text-muted transition hover:border-primary/40 hover:text-foreground">
              <Upload className="h-4 w-4" />
              {videoFile ? videoFile.name : 'Choose MP4, WebM or MOV'}
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                disabled={saving}
                className="hidden"
                onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={published}
              disabled={saving}
              onChange={(event) => setPublished(event.target.checked)}
            />
            Publish immediately
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {saving ? 'Uploading…' : 'Save tutorial'}
        </button>
      </form>
      ) : (
        <p className="rounded-2xl border border-border bg-surface-raised p-5 text-sm text-subtle md:p-6">
          You can view tutorials but do not have permission to upload new ones.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Published tutorials</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tutorials.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-raised p-6 text-sm text-muted">
            No tutorials yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {tutorials.map((tutorial) => (
              <li
                key={tutorial.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{tutorial.title}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {tutorial.category} · {AUDIENCE_LABELS[tutorial.audience as HelpTutorialAudience] ?? tutorial.audience}
                    {tutorial.audienceValue ? ` · ${tutorial.audienceValue}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {tutorial.published ? 'Published' : 'Draft'} · Order {tutorial.sortOrder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {canUpdate ? (
                    <button
                      type="button"
                      onClick={() => void handleTogglePublished(tutorial)}
                      className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
                    >
                      {tutorial.published ? 'Unpublish' : 'Publish'}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={deletingId === tutorial.id}
                      onClick={() => void handleDelete(tutorial.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-900/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-950/30 disabled:opacity-60"
                    >
                      {deletingId === tutorial.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video duration.'));
    };
    video.src = url;
  });
}
