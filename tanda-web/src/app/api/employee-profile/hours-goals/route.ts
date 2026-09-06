import { NextResponse } from 'next/server';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

const WEEKLY_MIN = 1;
const WEEKLY_MAX = 80;
const MONTHLY_MIN = 1;
const MONTHLY_MAX = 400;

function parseGoal(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number | { error: string } {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    return { error: `${label} must be a whole number.` };
  }
  if (numeric < min || numeric > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }
  return numeric;
}

export async function PATCH(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, number> = {};

    if ('weeklyHoursGoal' in body) {
      const weekly = parseGoal(
        body.weeklyHoursGoal,
        WEEKLY_MIN,
        WEEKLY_MAX,
        'Weekly hours goal',
      );
      if (typeof weekly === 'object') {
        return NextResponse.json({ error: weekly.error }, { status: 400 });
      }
      payload.weeklyHoursGoal = weekly;
    }

    if ('monthlyHoursGoal' in body) {
      const monthly = parseGoal(
        body.monthlyHoursGoal,
        MONTHLY_MIN,
        MONTHLY_MAX,
        'Monthly hours goal',
      );
      if (typeof monthly === 'object') {
        return NextResponse.json({ error: monthly.error }, { status: 400 });
      }
      payload.monthlyHoursGoal = monthly;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: 'Provide weeklyHoursGoal and/or monthlyHoursGoal.' },
        { status: 400 },
      );
    }

    await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employee.employeeDocId)
      .update(payload);

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    console.error('PATCH /api/employee-profile/hours-goals', error);
    return NextResponse.json(
      { error: 'Could not save hours goal.' },
      { status: 500 },
    );
  }
}
