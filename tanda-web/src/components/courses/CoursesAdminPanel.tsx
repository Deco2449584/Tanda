'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  courseStatusBadgeClass,
  courseStatusLabel,
} from '@/components/courses/course-status';
import {
  createCourseRequest,
  deleteCourseRequest,
  reviewCourseEnrollmentRequest,
  updateCourseRequest,
  type SerializedCourse,
  type SerializedCourseEnrollment,
} from '@/lib/courses/courses-api';
import {
  COURSE_CATEGORIES,
  type CourseCategory,
} from '@/lib/types/course';

interface CoursesAdminPanelProps {
  courses: SerializedCourse[];
  enrollments: SerializedCourseEnrollment[];
  loading?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canManage?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function CoursesAdminPanel({
  courses,
  enrollments,
  loading,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  canManage = true,
  onChanged,
  onError,
}: CoursesAdminPanelProps) {
  const [tab, setTab] = useState<'catalog' | 'review'>('catalog');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [category, setCategory] = useState<CourseCategory>('Compliance');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const stats = useMemo(() => {
    const submitted = enrollments.filter((item) => item.status === 'submitted').length;
    const approved = enrollments.filter((item) => item.status === 'approved').length;
    const rejected = enrollments.filter((item) => item.status === 'rejected').length;
    const assigned = enrollments.filter((item) => item.status === 'assigned').length;
    return { submitted, approved, rejected, assigned, total: enrollments.length };
  }, [enrollments]);

  const reviewQueue = useMemo(
    () =>
      enrollments
        .filter((item) => item.status === 'submitted')
        .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')),
    [enrollments],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !externalUrl.trim()) {
      onError('Title and course URL are required.');
      return;
    }

    setSaving(true);
    try {
      await createCourseRequest({
        title: title.trim(),
        description: description.trim(),
        externalUrl: externalUrl.trim(),
        platformName: platformName.trim() || undefined,
        category,
        dueDate: dueDate || undefined,
        active: true,
      });
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setPlatformName('');
      setCategory('Compliance');
      setDueDate('');
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not create course.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(course: SerializedCourse) {
    if (!canUpdate) return;
    setBusyId(course.id);
    try {
      await updateCourseRequest(course.id, { active: !course.active });
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not update course.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(course: SerializedCourse) {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete "${course.title}" and all employee progress for it? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusyId(course.id);
    try {
      await deleteCourseRequest(course.id);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete course.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReview(
    enrollment: SerializedCourseEnrollment,
    status: 'approved' | 'rejected',
  ) {
    if (!canManage) return;
    setBusyId(enrollment.id);
    try {
      await reviewCourseEnrollmentRequest(enrollment.id, {
        status,
        reviewNotes: reviewNotes[enrollment.id],
      });
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not review submission.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-5 md:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <GraduationCap className="h-3.5 w-3.5" aria-hidden />
              External training tracker
            </div>
            <h2 className="mt-3 font-display text-2xl font-normal tracking-wide text-foreground md:text-3xl">
              Courses & certifications
            </h2>
            <p className="mt-2 text-sm text-muted">
              Assign courses hosted on other platforms, collect completion evidence,
              then verify and approve once you confirm it on the provider.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Active courses" value={courses.filter((c) => c.active).length} />
            <StatChip label="Awaiting review" value={stats.submitted} accent />
            <StatChip label="Approved" value={stats.approved} />
            <StatChip label="Assigned" value={stats.assigned} />
          </div>
        </div>
      </section>

      <div className="inline-flex rounded-xl border border-border bg-surface-base/60 p-1">
        <button
          type="button"
          onClick={() => setTab('catalog')}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tab === 'catalog'
              ? 'bg-primary/15 text-primary'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Course catalog
        </button>
        <button
          type="button"
          onClick={() => setTab('review')}
          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
            tab === 'review'
              ? 'bg-primary/15 text-primary'
              : 'text-muted hover:text-foreground'
          }`}
        >
          Review queue
          {stats.submitted > 0 ? (
            <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
              {stats.submitted}
            </span>
          ) : null}
        </button>
      </div>

      {tab === 'catalog' ? (
        <div className="space-y-6">
          {canCreate ? (
            <form
              onSubmit={(event) => void handleCreate(event)}
              className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5 md:p-6"
            >
              <div>
                <h3 className="text-sm font-semibold text-foreground">New course</h3>
                <p className="mt-1 text-xs text-subtle">
                  Active staff are enrolled automatically when you publish a course.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
                  <input
                    required
                    value={title}
                    disabled={saving}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="WHS Induction 2026"
                    className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    disabled={saving}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What staff need to complete and why it matters."
                    className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Course URL
                  </label>
                  <input
                    required
                    type="url"
                    value={externalUrl}
                    disabled={saving}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Platform (optional)
                  </label>
                  <input
                    value={platformName}
                    disabled={saving}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="LinkedIn Learning, Coursera…"
                    className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Category
                  </label>
                  <select
                    value={category}
                    disabled={saving}
                    onChange={(e) => setCategory(e.target.value as CourseCategory)}
                    className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {COURSE_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    disabled={saving}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving ? 'Creating…' : 'Create course'}
              </button>
            </form>
          ) : null}

          <section className="rounded-2xl border border-border bg-surface-raised/60 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground">Catalog</h3>
            {loading ? (
              <p className="mt-4 text-sm text-muted">Loading…</p>
            ) : courses.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No courses yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {courses.map((course) => (
                  <li
                    key={course.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface-base/40 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{course.title}</p>
                      <p className="mt-1 text-xs text-subtle">
                        {course.category}
                        {course.platformName ? ` · ${course.platformName}` : ''}
                        {course.dueDate ? ` · due ${course.dueDate}` : ''}
                      </p>
                      {course.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted">
                          {course.description}
                        </p>
                      ) : null}
                      <a
                        href={course.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Open course
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          course.active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-700 text-muted'
                        }`}
                      >
                        {course.active ? 'Active' : 'Inactive'}
                      </span>
                      {canUpdate ? (
                        <button
                          type="button"
                          disabled={busyId === course.id}
                          onClick={() => void handleToggleActive(course)}
                          className="rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
                        >
                          {course.active ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          disabled={busyId === course.id}
                          onClick={() => void handleDelete(course)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-950/30 disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
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
      ) : (
        <section className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted">Loading submissions…</p>
          ) : reviewQueue.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
              <Award className="mx-auto h-8 w-8 text-primary/70" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Review queue is clear
              </p>
              <p className="mt-1 text-xs text-muted">
                When employees submit completion evidence, they will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {reviewQueue.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className="rounded-2xl border border-amber-500/20 bg-surface-raised p-4 md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {enrollment.employeeName}
                      </p>
                      <p className="text-xs text-subtle">
                        {enrollment.employeeId} · {enrollment.courseTitle}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(enrollment.status)}`}
                      >
                        {courseStatusLabel(enrollment.status)}
                      </span>
                    </div>
                    {enrollment.submittedAt ? (
                      <p className="text-[11px] text-subtle">
                        Submitted {new Date(enrollment.submittedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  {enrollment.employeeNotes ? (
                    <p className="mt-3 rounded-lg border border-border bg-surface-base/60 px-3 py-2 text-sm text-muted">
                      {enrollment.employeeNotes}
                    </p>
                  ) : null}

                  {enrollment.evidenceUrl ? (
                    <a
                      href={enrollment.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View evidence
                      {enrollment.evidenceFileName
                        ? ` (${enrollment.evidenceFileName})`
                        : ''}
                    </a>
                  ) : null}

                  {canManage ? (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <textarea
                        rows={2}
                        value={reviewNotes[enrollment.id] ?? ''}
                        onChange={(e) =>
                          setReviewNotes((prev) => ({
                            ...prev,
                            [enrollment.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional review notes (visible to the employee)"
                        className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === enrollment.id}
                          onClick={() => void handleReview(enrollment, 'approved')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === enrollment.id}
                          onClick={() => void handleReview(enrollment, 'rejected')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-800/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject / redo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <section className="rounded-2xl border border-border bg-surface-raised/50 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-foreground">All progress</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-subtle">
                  <tr className="border-b border-border">
                    <th className="px-2 py-2 font-semibold">Employee</th>
                    <th className="px-2 py-2 font-semibold">Course</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.slice(0, 80).map((item) => (
                    <tr key={item.id} className="border-b border-border/60">
                      <td className="px-2 py-2 text-foreground">{item.employeeName}</td>
                      <td className="px-2 py-2 text-muted">{item.courseTitle}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(item.status)}`}
                        >
                          {courseStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-subtle">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        accent
          ? 'border-primary/30 bg-primary/10'
          : 'border-border/70 bg-surface-base/50'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
