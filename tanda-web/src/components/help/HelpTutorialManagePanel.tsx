'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  addHelpTutorialCategoryRequest,
  createHelpTutorialRequest,
  deleteHelpTutorialRequest,
  updateHelpTutorialRequest,
  type SerializedHelpTutorial,
} from '@/lib/help/help-tutorials-api';
import {
  detectHelpResourceKind,
  uploadTutorialResource,
} from '@/lib/media/storage-uploads';
import { HelpTutorialCategoryField } from '@/components/help/HelpTutorialCategoryField';
import {
  HELP_RESOURCE_KINDS,
  HELP_RESOURCE_KIND_LABELS,
  HELP_TUTORIAL_AUDIENCES,
  HELP_TUTORIAL_USER_ROLES,
  type HelpResourceKind,
  type HelpTutorialAttachment,
  type HelpTutorialAudience,
  type HelpTutorialUserRole,
} from '@/lib/types/help-tutorial';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import { useDepartments } from '@/providers/DepartmentsProvider';

interface HelpTutorialManagePanelProps {
  tutorials: SerializedHelpTutorial[];
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
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

const KIND_ACCEPT: Record<Exclude<HelpResourceKind, 'link'>, string> = {
  video: 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov',
  pdf: 'application/pdf,.pdf',
  document:
    '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/rtf,application/zip',
  image: 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
};

const KIND_HINT: Record<HelpResourceKind, string> = {
  video: 'MP4, WebM or MOV — max 100 MB',
  pdf: 'PDF guide — max 25 MB',
  document: 'Word, Excel, PowerPoint, TXT, CSV, ZIP — max 25 MB',
  image: 'JPEG, PNG, WebP or GIF — max 10 MB',
  link: 'Public https URL to a guide, Notion page, Drive folder, etc.',
};

const KIND_ICONS: Record<HelpResourceKind, typeof Video> = {
  video: Video,
  pdf: FileText,
  document: FileText,
  image: ImageIcon,
  link: Link2,
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HelpTutorialManagePanel({
  tutorials,
  categories,
  onCategoriesChange,
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
  const extraFileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<HelpResourceKind>('video');
  const [audience, setAudience] = useState<HelpTutorialAudience>('all');
  const [audienceValue, setAudienceValue] = useState('');
  const [audienceRoles, setAudienceRoles] = useState<HelpTutorialUserRole[]>(['empleado']);
  const [sortOrder, setSortOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const defaultCategory = categories[0] ?? '';

  useEffect(() => {
    if (!category && defaultCategory) {
      setCategory(defaultCategory);
      return;
    }

    if (category && !categories.includes(category) && defaultCategory) {
      setCategory(defaultCategory);
    }
  }, [categories, category, defaultCategory]);

  async function handleAddCategory(name: string) {
    const nextCategories = await addHelpTutorialCategoryRequest(name);
    onCategoriesChange(nextCategories);
    return nextCategories;
  }

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

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory(defaultCategory);
    setKind('video');
    setAudience('all');
    setAudienceValue('');
    setAudienceRoles(['empleado']);
    setSortOrder(0);
    setPublished(true);
    setPrimaryFile(null);
    setExternalUrl('');
    setExtraFiles([]);
    if (fileRef.current) fileRef.current.value = '';
    if (extraFileRef.current) extraFileRef.current.value = '';
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!category.trim()) {
      onError('Select or add a category.');
      return;
    }

    if (!title.trim()) {
      onError('Title is required.');
      return;
    }

    if (kind === 'link') {
      if (!externalUrl.trim()) {
        onError('Enter an external URL.');
        return;
      }
    } else if (!primaryFile) {
      onError('Select a file to upload.');
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
      const attachments: HelpTutorialAttachment[] = [];

      let videoUrl: string | undefined;
      let videoPath: string | undefined;
      let fileUrl: string | undefined;
      let filePath: string | undefined;
      let fileName: string | undefined;
      let contentType: string | undefined;
      let sizeBytes: number | undefined;
      let durationSeconds: number | undefined;
      let linkUrl: string | undefined;

      if (kind === 'link') {
        linkUrl = externalUrl.trim();
        attachments.push({
          id: 'primary-link',
          kind: 'link',
          url: linkUrl,
        });
      } else if (primaryFile) {
        const uploaded = await uploadTutorialResource(tutorialId, primaryFile, {
          kind,
        });

        attachments.push({
          id: 'primary',
          kind: uploaded.kind,
          url: uploaded.url,
          path: uploaded.path,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
        });

        if (kind === 'video') {
          videoUrl = uploaded.url;
          videoPath = uploaded.path;
          try {
            durationSeconds = await readVideoDuration(primaryFile);
          } catch {
            durationSeconds = undefined;
          }
        } else {
          fileUrl = uploaded.url;
          filePath = uploaded.path;
          fileName = uploaded.fileName;
          contentType = uploaded.contentType;
          sizeBytes = uploaded.sizeBytes;
        }
      }

      for (const extra of extraFiles) {
        const extraKind = detectHelpResourceKind(extra);
        const uploaded = await uploadTutorialResource(tutorialId, extra, {
          kind: extraKind,
          fileId: crypto.randomUUID(),
        });
        attachments.push({
          id: crypto.randomUUID(),
          kind: uploaded.kind,
          url: uploaded.url,
          path: uploaded.path,
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          sizeBytes: uploaded.sizeBytes,
        });
      }

      await createHelpTutorialRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        audience,
        audienceValue:
          audience === 'department' || audience === 'location'
            ? audienceValue.trim()
            : undefined,
        audienceRoles: audience === 'userRole' ? audienceRoles : undefined,
        kind,
        videoUrl,
        videoPath,
        fileUrl,
        filePath,
        fileName,
        contentType,
        sizeBytes,
        externalUrl: linkUrl,
        attachments,
        sortOrder,
        published,
        durationSeconds,
      });

      resetForm();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save guide.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished(tutorial: SerializedHelpTutorial) {
    try {
      await updateHelpTutorialRequest(tutorial.id, { published: !tutorial.published });
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update guide.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this help guide? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      await deleteHelpTutorialRequest(id);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete guide.');
    } finally {
      setDeletingId(null);
    }
  }

  const KindIcon = KIND_ICONS[kind];

  return (
    <div className="space-y-6">
      {canCreate ? (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5 md:p-6"
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add help guide</h2>
            <p className="mt-1 text-xs text-subtle">
              Upload videos, PDFs, documents, images, or link to an external guide.
              Extra attachments can be added to the same item.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 md:col-span-2">
              <p className="mb-2 text-xs font-medium text-muted">Resource type</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {HELP_RESOURCE_KINDS.map((item) => {
                  const Icon = KIND_ICONS[item];
                  const selected = kind === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setKind(item);
                        setPrimaryFile(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                        selected
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border bg-surface-base text-muted hover:border-border-strong hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {HELP_RESOURCE_KIND_LABELS[item]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
              <input
                type="text"
                required
                maxLength={120}
                value={title}
                disabled={saving}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. How to clock in at the kiosk"
                className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="min-w-0 md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                disabled={saving}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short summary so staff know what this guide covers."
                className="w-full min-w-0 resize-y rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <HelpTutorialCategoryField
              categories={categories}
              value={category}
              onChange={setCategory}
              onAddCategory={handleAddCategory}
              disabled={saving}
              onError={onError}
            />

            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Sort order
              </label>
              <input
                type="number"
                min={0}
                value={sortOrder}
                disabled={saving}
                onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
                className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Audience
              </label>
              <select
                value={audience}
                disabled={saving}
                onChange={(event) => {
                  setAudience(event.target.value as HelpTutorialAudience);
                  setAudienceValue('');
                }}
                className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                {HELP_TUTORIAL_AUDIENCES.map((item) => (
                  <option key={item} value={item}>
                    {AUDIENCE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            {audience === 'department' ? (
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Department
                </label>
                <select
                  value={audienceValue}
                  disabled={saving}
                  onChange={(event) => setAudienceValue(event.target.value)}
                  className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
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
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Location
                </label>
                <select
                  value={audienceValue}
                  disabled={saving}
                  onChange={(event) => setAudienceValue(event.target.value)}
                  className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
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

            {kind === 'link' ? (
              <div className="min-w-0 md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  External URL
                </label>
                <input
                  type="url"
                  required
                  value={externalUrl}
                  disabled={saving}
                  onChange={(event) => setExternalUrl(event.target.value)}
                  placeholder="https://…"
                  className="w-full min-w-0 rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
                <p className="mt-1 text-[11px] text-subtle">{KIND_HINT.link}</p>
              </div>
            ) : (
              <div className="min-w-0 md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-muted">
                  Primary {HELP_RESOURCE_KIND_LABELS[kind].toLowerCase()}
                </label>
                <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-xs text-muted transition hover:border-primary/40 hover:text-foreground">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">
                    {primaryFile ? primaryFile.name : KIND_HINT[kind]}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={KIND_ACCEPT[kind]}
                    disabled={saving}
                    className="hidden"
                    onChange={(event) =>
                      setPrimaryFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            )}

            <div className="min-w-0 md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Extra attachments (optional)
              </label>
              <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted transition hover:border-primary/40 hover:text-foreground">
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">
                  Add PDFs, docs, images or videos to this guide
                </span>
                <input
                  ref={extraFileRef}
                  type="file"
                  multiple
                  accept={`${KIND_ACCEPT.video},${KIND_ACCEPT.pdf},${KIND_ACCEPT.document},${KIND_ACCEPT.image}`}
                  disabled={saving}
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    setExtraFiles((current) => [...current, ...files]);
                    event.target.value = '';
                  }}
                />
              </label>
              {extraFiles.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {extraFiles.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-base px-3 py-2 text-xs text-muted"
                    >
                      <span className="min-w-0 truncate">
                        {file.name}
                        {file.size ? ` · ${formatBytes(file.size)}` : ''}
                      </span>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setExtraFiles((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="rounded p-1 text-subtle hover:text-foreground"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
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
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KindIcon className="h-4 w-4" />
            )}
            {saving ? 'Uploading…' : 'Save guide'}
          </button>
        </form>
      ) : (
        <p className="rounded-2xl border border-border bg-surface-raised p-5 text-sm text-subtle md:p-6">
          You can view guides but do not have permission to upload new ones.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">All guides</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : tutorials.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface-raised p-6 text-sm text-muted">
            No help guides yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {tutorials.map((tutorial) => {
              const tutorialKind = (tutorial.kind ?? 'video') as HelpResourceKind;
              const Icon = KIND_ICONS[tutorialKind] ?? Video;
              const extraCount = Math.max(
                0,
                (tutorial.attachments?.length ?? 0) - 1,
              );

              return (
                <li
                  key={tutorial.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface-raised p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate">{tutorial.title}</span>
                    </p>
                    <p className="mt-1 break-words text-xs text-subtle">
                      {HELP_RESOURCE_KIND_LABELS[tutorialKind]} · {tutorial.category} ·{' '}
                      {AUDIENCE_LABELS[tutorial.audience as HelpTutorialAudience] ??
                        tutorial.audience}
                      {tutorial.audienceValue ? ` · ${tutorial.audienceValue}` : ''}
                      {tutorial.fileName ? ` · ${tutorial.fileName}` : ''}
                      {extraCount > 0
                        ? ` · +${extraCount} attachment${extraCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {tutorial.published ? 'Published' : 'Draft'} · Order{' '}
                      {tutorial.sortOrder}
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
              );
            })}
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
