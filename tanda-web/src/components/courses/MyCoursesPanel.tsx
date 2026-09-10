'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Loader2,
  Sparkles,
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
      todo: enrollments.filter((e) => e.status === 'assigned' || e.status === 'rejected')
        .length,
      waiting: enrollments.filter((e) => e.status === 'submitted').length,
      done: enrollments.filter((e) => e.status === 'approved').length,
    };
  }, [enrollments]);

  const active = sorted.find((item) => item.id === activeId) ?? null;
  const activeCourse = active ? courseById.get(active.courseId) : null;

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
      onError(error instanceof Error ? error.message : 'Could not submit evidence.');
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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-5 md:p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Your training path
          </div>
          <h2 className="mt-3 font-display text-2xl font-normal tracking-wide text-foreground">
            My courses
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Complete the linked courses on their platforms, then upload proof so
            your manager can verify and approve.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <HeroStat label="Still to do" value={stats.todo} />
            <HeroStat label="Awaiting review" value={stats.waiting} />
            <HeroStat label="Approved" value={stats.done} accent />
          </div>
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-subtle" />
          <p className="mt-3 text-sm text-muted">No courses assigned yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {sorted.map((enrollment) => {
              const course = courseById.get(enrollment.courseId);
              const selected = activeId === enrollment.id;

              return (
                <li key={enrollment.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(enrollment.id);
                      setNotes(enrollment.employeeNotes ?? '');
                      setFile(null);
                    }}
                    className={`flex h-full w-full flex-col rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-primary/50 bg-primary/5 shadow-[0_0_0_1px_rgba(245,30,160,0.2)]'
                        : 'border-border bg-surface-raised hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {enrollment.courseTitle}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${courseStatusBadgeClass(enrollment.status)}`}
                      >
                        {courseStatusLabel(enrollment.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-subtle">
                      {course?.category ?? 'Course'}
                      {course?.platformName ? ` · ${course.platformName}` : ''}
                    </p>
                    {course?.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-muted">
                        {course.description}
                      </p>
                    ) : null}
                    {course?.dueDate ? (
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                        Due {course.dueDate}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className="xl:sticky xl:top-4 xl:self-start">
            {active && activeCourse ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised/80">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {active.courseTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {activeCourse.platformName || activeCourse.category}
                  </p>
                </div>

                <div className="space-y-4 p-4">
                  {activeCourse.description ? (
                    <p className="text-sm text-muted">{activeCourse.description}</p>
                  ) : null}

                  <a
                    href={activeCourse.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Open course
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  {active.status === 'approved' ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
                      <p className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Approved
                      </p>
                      {active.reviewNotes ? (
                        <p className="mt-1 text-xs text-emerald-100/80">
                          {active.reviewNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {active.status === 'submitted' ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                      Evidence submitted — waiting for admin verification.
                    </div>
                  ) : null}

                  {active.status === 'rejected' ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                      <p className="font-semibold">Needs redo</p>
                      {active.reviewNotes ? (
                        <p className="mt-1 text-xs text-red-100/80">{active.reviewNotes}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {active.evidenceUrl ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">
                        Your evidence
                      </p>
                      {active.evidenceUrl.toLowerCase().includes('.pdf') ||
                      active.evidenceFileName?.toLowerCase().endsWith('.pdf') ? (
                        <a
                          href={active.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Open uploaded PDF
                        </a>
                      ) : isFirebaseStorageUrl(active.evidenceUrl) ? (
                        <FirebaseImage
                          src={active.evidenceUrl}
                          alt="Completion evidence"
                          width={640}
                          height={360}
                          className="h-auto w-full rounded-lg object-cover"
                          sizes="352px"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={active.evidenceUrl}
                          alt="Completion evidence"
                          className="h-auto w-full rounded-lg object-cover"
                        />
                      )}
                    </div>
                  ) : null}

                  {active.status === 'assigned' || active.status === 'rejected' ? (
                    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted">
                          Completion evidence *
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-xs text-muted hover:border-primary/40 hover:text-foreground">
                          <Upload className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {file
                              ? file.name
                              : 'Screenshot or PDF certificate (max 10 MB)'}
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
                              setFile(next);
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
                          onChange={(e) => setNotes(e.target.value)}
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
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-sm text-muted">
                Select a course to open the link and submit evidence.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
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
      className={`rounded-xl border px-4 py-3 ${
        accent
          ? 'border-primary/30 bg-primary/10'
          : 'border-border/70 bg-surface-base/50'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
