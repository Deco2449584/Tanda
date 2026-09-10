'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  courseStatusBadgeClass,
  courseStatusLabel,
} from '@/components/courses/course-status';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import {
  submitCourseEnrollmentRequest,
  type SerializedCourse,
  type SerializedCourseEnrollment,
} from '@/lib/courses/courses-api';
import { uploadCourseEvidence } from '@/lib/media/storage-uploads';
import { cn } from '@/lib/cn';
import { isFirebaseStorageUrl, validateImageFile } from '@/utils/imageOptimizer';

interface MyCoursesPanelProps {
  courses: SerializedCourse[];
  enrollments: SerializedCourseEnrollment[];
  employeeId: string;
  loading?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

function formatDeadline(dueDate?: string): {
  label: string;
  tone: 'ok' | 'soon' | 'overdue' | 'none';
} {
  if (!dueDate) return { label: 'No deadline set', tone: 'none' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) {
    return { label: `Deadline ${dueDate}`, tone: 'ok' };
  }

  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return {
      label: `Deadline passed · ${dueDate}`,
      tone: 'overdue',
    };
  }
  if (diffDays <= 7) {
    return {
      label: `Deadline ${dueDate} · ${diffDays === 0 ? 'today' : `${diffDays}d left`}`,
      tone: 'soon',
    };
  }
  return { label: `Deadline ${dueDate}`, tone: 'ok' };
}

export function MyCoursesPanel({
  courses,
  enrollments,
  employeeId,
  loading,
  onChanged,
  onError,
  onSuccess,
}: MyCoursesPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const courseById = useMemo(() => {
    const map = new Map<string, SerializedCourse>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  const sorted = useMemo(() => {
    const rank = { assigned: 0, rejected: 1, submitted: 2, approved: 3 };
    return [...enrollments].sort((a, b) => {
      const rankDiff = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      if (rankDiff !== 0) return rankDiff;
      return a.courseTitle.localeCompare(b.courseTitle);
    });
  }, [enrollments]);

  const stats = useMemo(() => {
    return {
      todo: enrollments.filter(
        (e) => e.status === 'assigned' || e.status === 'rejected',
      ).length,
      waiting: enrollments.filter((e) => e.status === 'submitted').length,
      done: enrollments.filter((e) => e.status === 'approved').length,
    };
  }, [enrollments]);

  const active = sorted.find((item) => item.id === activeId) ?? null;
  const activeCourse = active ? courseById.get(active.courseId) : null;

  function openCourse(enrollment: SerializedCourseEnrollment) {
    setActiveId(enrollment.id);
    setNotes(enrollment.employeeNotes ?? '');
    setFile(null);
  }

  function backToList() {
    setActiveId(null);
    setFile(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!active || !file) {
      onError('Upload a screenshot or PDF certificate as evidence.');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadCourseEvidence(employeeId, active.id, file);
      await submitCourseEnrollmentRequest(active.id, {
        evidenceUrl: uploaded.evidenceUrl,
        evidencePath: uploaded.evidencePath,
        evidenceFileName: uploaded.evidenceFileName,
        employeeNotes: notes.trim() || undefined,
      });
      setFile(null);
      setNotes('');
      onSuccess('Evidence submitted. An admin will verify and approve it.');
      onChanged();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : 'Could not submit evidence.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        Loading your courses…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface-raised p-4 md:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <HeroStat label="Still to do" value={stats.todo} />
          <HeroStat label="Awaiting review" value={stats.waiting} />
          <HeroStat label="Approved" value={stats.done} accent />
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-3 text-sm text-muted">No courses assigned yet.</p>
        </div>
      ) : active && activeCourse ? (
        <CourseDetail
          enrollment={active}
          course={activeCourse}
          notes={notes}
          file={file}
          submitting={submitting}
          onBack={backToList}
          onNotesChange={setNotes}
          onFileChange={setFile}
          onSubmit={(event) => void handleSubmit(event)}
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Your courses</h2>
            <p className="text-xs text-muted">
              Tap a course to open details, the external link, and submit evidence.
            </p>
          </header>
          <ul className="divide-y divide-border/70">
            {sorted.map((enrollment) => {
              const course = courseById.get(enrollment.courseId);
              const deadline = formatDeadline(course?.dueDate);
              const approved = enrollment.status === 'approved';

              return (
                <li key={enrollment.id}>
                  <button
                    type="button"
                    onClick={() => openCourse(enrollment)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface-hover/50',
                      approved && 'bg-emerald-500/[0.04]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        approved
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {approved ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden />
                      ) : (
                        <GraduationCap className="h-5 w-5" aria-hidden />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {enrollment.courseTitle}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            courseStatusBadgeClass(enrollment.status),
                          )}
                        >
                          {courseStatusLabel(enrollment.status)}
                        </span>
                      </span>

                      <span className="mt-1 block truncate text-xs text-subtle">
                        {course?.platformName || course?.category || 'External course'}
                        {course?.category && course?.platformName
                          ? ` · ${course.category}`
                          : ''}
                      </span>

                      <span
                        className={cn(
                          'mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium',
                          deadline.tone === 'overdue' && 'text-red-300',
                          deadline.tone === 'soon' && 'text-amber-300',
                          deadline.tone === 'ok' && 'text-muted',
                          deadline.tone === 'none' && 'text-subtle',
                        )}
                      >
                        <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
                        {deadline.label}
                      </span>

                      {approved && enrollment.reviewedAt ? (
                        <span className="mt-1 block text-[11px] text-emerald-300/90">
                          Approved by manager
                          {enrollment.reviewedBy
                            ? ` · ${enrollment.reviewedBy}`
                            : ''}
                        </span>
                      ) : null}
                    </span>

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-subtle"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function CourseDetail({
  enrollment,
  course,
  notes,
  file,
  submitting,
  onBack,
  onNotesChange,
  onFileChange,
  onSubmit,
}: {
  enrollment: SerializedCourseEnrollment;
  course: SerializedCourse;
  notes: string;
  file: File | null;
  submitting: boolean;
  onBack: () => void;
  onNotesChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const deadline = formatDeadline(course.dueDate);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {enrollment.courseTitle}
            </h2>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                courseStatusBadgeClass(enrollment.status),
              )}
            >
              {courseStatusLabel(enrollment.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {course.platformName || course.category}
          </p>
        </div>
      </header>

      <div className="space-y-4 p-4 md:p-5">
        {course.description ? (
          <p className="text-sm leading-relaxed text-muted">{course.description}</p>
        ) : null}

        <div
          className={cn(
            'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs',
            deadline.tone === 'overdue' &&
              'border-red-500/30 bg-red-500/10 text-red-200',
            deadline.tone === 'soon' &&
              'border-amber-500/30 bg-amber-500/10 text-amber-100',
            deadline.tone === 'ok' && 'border-border bg-surface-base text-muted',
            deadline.tone === 'none' && 'border-border bg-surface-base text-subtle',
          )}
        >
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">Maximum completion deadline</p>
            <p className="mt-0.5 opacity-90">{deadline.label}</p>
          </div>
        </div>

        <a
          href={course.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Open course on platform
          <ExternalLink className="h-4 w-4" />
        </a>

        {enrollment.status === 'approved' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Approved by manager
            </p>
            {enrollment.reviewedBy ? (
              <p className="mt-1 text-xs text-emerald-100/80">
                Reviewed by {enrollment.reviewedBy}
                {enrollment.reviewedAt
                  ? ` · ${new Date(enrollment.reviewedAt).toLocaleString()}`
                  : ''}
              </p>
            ) : null}
            {enrollment.reviewNotes ? (
              <p className="mt-2 text-xs text-emerald-100/80">
                {enrollment.reviewNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        {enrollment.status === 'submitted' ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
            Evidence submitted — waiting for manager verification.
          </div>
        ) : null}

        {enrollment.status === 'rejected' ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
            <p className="font-semibold">Needs redo</p>
            {enrollment.reviewNotes ? (
              <p className="mt-1 text-xs text-red-100/80">{enrollment.reviewNotes}</p>
            ) : (
              <p className="mt-1 text-xs text-red-100/80">
                Your manager asked you to complete this again and resubmit evidence.
              </p>
            )}
          </div>
        ) : null}

        {enrollment.evidenceUrl ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
              Your evidence
            </p>
            {enrollment.evidenceUrl.toLowerCase().includes('.pdf') ||
            enrollment.evidenceFileName?.toLowerCase().endsWith('.pdf') ? (
              <a
                href={enrollment.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open uploaded PDF
              </a>
            ) : isFirebaseStorageUrl(enrollment.evidenceUrl) ? (
              <FirebaseImage
                src={enrollment.evidenceUrl}
                alt="Completion evidence"
                width={960}
                height={540}
                className="h-auto max-h-72 w-full rounded-lg object-cover"
                sizes="(max-width: 768px) 100vw, 640px"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={enrollment.evidenceUrl}
                alt="Completion evidence"
                className="h-auto max-h-72 w-full rounded-lg object-cover"
              />
            )}
          </div>
        ) : null}

        {enrollment.status === 'assigned' || enrollment.status === 'rejected' ? (
          <form onSubmit={onSubmit} className="space-y-3 border-t border-border pt-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Completion evidence *
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-xs text-muted hover:border-primary/40 hover:text-foreground">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {file ? file.name : 'Screenshot or PDF certificate (max 10 MB)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                  className="hidden"
                  disabled={submitting}
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null;
                    if (next?.type.startsWith('image/')) {
                      const error = validateImageFile(next);
                      if (error) {
                        window.alert(error);
                        e.target.value = '';
                        return;
                      }
                    }
                    onFileChange(next);
                  }}
                />
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                disabled={submitting}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="e.g. Completed module 3 certificate attached"
                className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !file}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              {submitting ? 'Submitting…' : 'Mark finished & submit'}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function HeroStat({
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
      className={cn(
        'rounded-xl border px-4 py-3',
        accent
          ? 'border-primary/30 bg-primary/10'
          : 'border-border/70 bg-surface-base/50',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          accent ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}
