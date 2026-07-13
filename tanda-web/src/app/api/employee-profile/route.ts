import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

const PERSONAL_FIELDS = [
  'phone',
  'dateOfBirth',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postcode',
  'country',
  'emergencyContactName',
  'emergencyContactPhone',
  'passportNumber',
  'visaExpiry',
] as const;

function optionalTrim(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const employeeRef = getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employee.employeeDocId);
    const existing = await employeeRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    if (existing.data()?.personalProfileStatus === 'Approved') {
      return NextResponse.json(
        {
          error:
            'Your profile is already approved and cannot be edited. Contact an administrator if changes are needed.',
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const passportUrl = optionalTrim(body.passportUrl);
    const visaUrl = optionalTrim(body.visaUrl);
    const passportFileName = optionalTrim(body.passportFileName);
    const visaFileName = optionalTrim(body.visaFileName);

    if (!passportUrl || !visaUrl) {
      return NextResponse.json(
        { error: 'Passport and visa documents are required to submit your profile.' },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      personalProfileStatus: 'Pending',
      personalProfileSubmittedAt: FieldValue.serverTimestamp(),
      personalProfileRejectionReason: FieldValue.delete(),
      personalProfileReviewedAt: FieldValue.delete(),
      passportUrl,
      visaUrl,
    };

    if (passportFileName) payload.passportFileName = passportFileName;
    if (visaFileName) payload.visaFileName = visaFileName;

    for (const field of PERSONAL_FIELDS) {
      const value = optionalTrim(body[field]);
      if (value) {
        payload[field] = value;
      } else {
        payload[field] = FieldValue.delete();
      }
    }

    await employeeRef.update(payload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/employee-profile', error);
    return NextResponse.json(
      { error: 'Could not submit personal profile.' },
      { status: 500 },
    );
  }
}
