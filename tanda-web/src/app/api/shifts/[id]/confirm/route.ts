import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { respondToShiftConfirmation } from '@/lib/shifts/server/shift-confirmation-service';
import type { ShiftConfirmationStatus } from '@/lib/types/shift';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseResponse(value: unknown): Exclude<ShiftConfirmationStatus, 'pending'> | null {
  if (value === 'confirmed' || value === 'declined') return value;
  return null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!employee.employeeId) {
      return NextResponse.json({ error: 'Employee code missing.' }, { status: 400 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { response?: unknown; note?: string };
    const response = parseResponse(body.response);

    if (!response) {
      return NextResponse.json({ error: 'Invalid response.' }, { status: 400 });
    }

    const shift = await respondToShiftConfirmation({
      shiftId: id,
      employeeId: employee.employeeId,
      response,
      note: body.note,
    });

    await recordAuditFromRequest(
      request,
      { email: employee.email, uid: employee.uid },
      {
        action: response === 'confirmed' ? 'shift.confirmed' : 'shift.declined',
        entityType: 'shift',
        entityId: shift.id,
        summary:
          response === 'confirmed'
            ? `${employee.name} confirmed shift on ${shift.date}`
            : `${employee.name} declined shift on ${shift.date}`,
        after: {
          confirmationStatus: shift.confirmationStatus,
          confirmationNote: shift.confirmationNote,
        },
      },
    );

    return NextResponse.json({ ok: true, shift });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not update shift confirmation.';
    console.error('POST /api/shifts/[id]/confirm', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
