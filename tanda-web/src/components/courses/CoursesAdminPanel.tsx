'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import { CourseAssigneePicker } from '@/components/courses/CourseAssigneePicker';
import {
  courseStatusBadgeClass,
  courseStatusLabel,
} from '@/components/courses/course-status';
import {
  assignCourseRequest,
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
import type { Employee } from '@/lib/types/employee';

interface CoursesAdminPanelProps {
  courses: SerializedCourse[];
  enrollments: SerializedCourseEnrollment[];
  employees: Employee[];
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
  employees,
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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [assignCourse, setAssignCourse] = useState<SerializedCourse | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);

  const enrolledByCourse = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const enrollment of enrollments) {
      const set = map.get(enrollment.courseId) ?? new Set<string>();
      set.add(enrollment.employeeDocId);
      map.set(enrollment.courseId, set);
    }
    return map;
  }, [enrollments]);

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
    if (assigneeIds.length === 0) {
      onError('Select at least one employee to assign this course.');
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
        assigneeEmployeeDocIds: assigneeIds,
      });
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setPlatformName('');
      setCategory('Compliance');
      setDueDate('');
      setAssigneeIds([]);
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

  const reviewDetail =
    reviewQueue.find((item) => item.id === reviewDetailId) ?? null;

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
      setReviewDetailId(null);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not review submission.');
    } finally {
      setBusyId(null);
    }
  }

  function openAssign(course: SerializedCourse) {
    setAssignCourse(course);
    setAssignIds([]);
  }

  async function handleAssignMore() {
    if (!assignCourse) return;
    if (assignIds.length === 0) {
      onError('Select at least one employee to assign.');
      return;
    }

    setAssigning(true);
    try {
      const result = await assignCourseRequest(assignCourse.id, {
        employeeDocIds: assignIds,
      });
      setAssignCourse(null);
      setAssignIds([]);
      onChanged();
      if (result.assigned === 0) {
        // Still refresh; toast as info via error channel is fine for now.
        onError('No new assignments — selected people may already be enrolled.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not assign course.');
    } finally {
      setAssigning(false);
    }
  }

  const canAssignMore = canManage || canUpdate;

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-border bg-surface-base/60 p-1">
        <button
          type="button"
          onClick={() => {
            setTab('catalog');
            setReviewDetailId(null);
          }}
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
                  Choose who should take this course. You can assign more people later.
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

                <CourseAssigneePicker
                  employees={employees}
                  selectedIds={assigneeIds}
                  onChange={setAssigneeIds}
                  disabled={saving}
                />
              </div>

              <button
                type="submit"
                disabled={saving || assigneeIds.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving
                  ? 'Creating…'
                  : `Create & assign (${assigneeIds.length})`}
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
                {courses.map((course) => {
                  const enrolledCount = enrolledByCourse.get(course.id)?.size ?? 0;

                  return (
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
                        {` · ${enrolledCount} assigned`}
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
                      {canAssignMore ? (
                        <button
                          type="button"
                          disabled={busyId === course.id}
                          onClick={() => openAssign(course)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
                        >
                          <UserPlus className="h-3 w-3" />
                          Assign
                        </button>
                      ) : null}
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
                  );
                })}
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
          ) : reviewDetail ? (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
              <header className="flex items-start gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setReviewDetailId(null)}
                  className="mt-0.5 inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {reviewDetail.employeeName}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(reviewDetail.status)}`}
                    >
                      {courseStatusLabel(reviewDetail.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {reviewDetail.employeeId} · {reviewDetail.courseTitle}
                  </p>
                </div>
              </header>

              <div className="space-y-4 p-4 md:p-5">
                {reviewDetail.submittedAt ? (
                  <p className="text-[11px] text-subtle">
                    Submitted {new Date(reviewDetail.submittedAt).toLocaleString()}
                  </p>
                ) : null}

                {reviewDetail.employeeNotes ? (
                  <p className="rounded-lg border border-border bg-surface-base/60 px-3 py-2 text-sm text-muted">
                    {reviewDetail.employeeNotes}
                  </p>
                ) : null}

                {reviewDetail.evidenceUrl ? (
                  <a
                    href={reviewDetail.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View evidence
                    {reviewDetail.evidenceFileName
                      ? ` (${reviewDetail.evidenceFileName})`
                      : ''}
                  </a>
                ) : null}

                {canManage ? (
                  <div className="space-y-3 border-t border-border pt-4">
                    <textarea
                      rows={2}
                      value={reviewNotes[reviewDetail.id] ?? ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [reviewDetail.id]: e.target.value,
                        }))
                      }
                      placeholder="Optional review notes (visible to the employee)"
                      className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === reviewDetail.id}
                        onClick={() => void handleReview(reviewDetail, 'approved')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === reviewDetail.id}
                        onClick={() => void handleReview(reviewDetail, 'rejected')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-800/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject / redo
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
              <header className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Awaiting review
                </h3>
                <p className="text-xs text-muted">
                  Tap a row to open evidence and approve or reject.
                </p>
              </header>
              <ul className="divide-y divide-border/70">
                {reviewQueue.map((enrollment) => (
                  <li key={enrollment.id}>
                    <button
                      type="button"
                      onClick={() => setReviewDetailId(enrollment.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-hover/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {enrollment.employeeName}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(enrollment.status)}`}
                          >
                            {courseStatusLabel(enrollment.status)}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-subtle">
                          {enrollment.employeeId} · {enrollment.courseTitle}
                          {enrollment.submittedAt
                            ? ` · ${new Date(enrollment.submittedAt).toLocaleDateString()}`
                            : ''}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised/50">
            <header className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">All progress</h3>
            </header>
            <ul className="divide-y divide-border/60">
              {enrollments.slice(0, 60).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {item.employeeName}
                    </p>
                    <p className="truncate text-xs text-subtle">{item.courseTitle}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(item.status)}`}
                  >
                    {courseStatusLabel(item.status)}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right text-[11px] text-subtle sm:block">
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString()
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </section>
      )}

      {assignCourse ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface-raised p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Assign more people
                </h3>
                <p className="mt-1 text-xs text-muted">{assignCourse.title}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignCourse(null);
                  setAssignIds([]);
                }}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              <CourseAssigneePicker
                employees={employees}
                selectedIds={assignIds}
                onChange={setAssignIds}
                disabled={assigning}
                alreadyAssignedIds={enrolledByCourse.get(assignCourse.id)}
                title="Add assignees"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={assigning}
                onClick={() => {
                  setAssignCourse(null);
                  setAssignIds([]);
                }}
                className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning || assignIds.length === 0}
                onClick={() => void handleAssignMore()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {assigning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Assign selected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
