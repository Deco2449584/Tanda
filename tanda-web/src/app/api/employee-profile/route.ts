import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { COLLECTIONS } from '@/lib/constants';
import { validatePersonalDetails } from '@/lib/employees/validate-personal-details';
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

    const existingData = existing.data() ?? {};
    if (existingData.personalProfileStatus === 'Approved') {
      return NextResponse.json(
        {
          error:
            'Your profile is already approved and cannot be edited. Contact an administrator if changes are needed.',
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const documentsPending = body.documentsPending === true;

    const passportUrl =
      optionalTrim(body.passportUrl) ??
      (documentsPending ? optionalTrim(existingData.passportUrl) : undefined);
    const visaUrl =
      optionalTrim(body.visaUrl) ??
      (documentsPending ? optionalTrim(existingData.visaUrl) : undefined);
    const photoUrl =
      optionalTrim(body.photoUrl) ??
      (documentsPending ? optionalTrim(existingData.photoUrl) : undefined);
    const passportFileName =
      optionalTrim(body.passportFileName) ??
      (documentsPending ? optionalTrim(existingData.passportFileName) : undefined);
    const visaFileName =
      optionalTrim(body.visaFileName) ??
      (documentsPending ? optionalTrim(existingData.visaFileName) : undefined);

    const personalDetailsError = validatePersonalDetails({
      phone: optionalTrim(body.phone),
      dateOfBirth: optionalTrim(body.dateOfBirth),
      addressLine1: optionalTrim(body.addressLine1),
      addressLine2: optionalTrim(body.addressLine2),
      city: optionalTrim(body.city),
      state: optionalTrim(body.state),
      postcode: optionalTrim(body.postcode),
      country: optionalTrim(body.country),
      emergencyContactName: optionalTrim(body.emergencyContactName),
      emergencyContactPhone: optionalTrim(body.emergencyContactPhone),
      passportNumber: optionalTrim(body.passportNumber),
      visaExpiry: optionalTrim(body.visaExpiry),
    });
    if (personalDetailsError) {
      return NextResponse.json({ error: personalDetailsError }, { status: 400 });
    }

    if (!documentsPending) {
      if (!photoUrl) {
        return NextResponse.json(
          { error: 'A profile photo is required to submit your profile.' },
          { status: 400 },
        );
      }

      if (!passportUrl || !visaUrl) {
        return NextResponse.json(
          { error: 'Passport and visa documents are required to submit your profile.' },
          { status: 400 },
        );
      }
    }

    const payload: Record<string, unknown> = {
      personalProfileStatus: documentsPending ? 'Uploading' : 'Pending',
      personalProfileSubmittedAt: FieldValue.serverTimestamp(),
      personalProfileRejectionReason: FieldValue.delete(),
      personalProfileReviewedAt: FieldValue.delete(),
    };

    if (photoUrl) payload.photoUrl = photoUrl;
    if (passportUrl) payload.passportUrl = passportUrl;
    if (visaUrl) payload.visaUrl = visaUrl;
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

    return NextResponse.json({
      ok: true,
      status: documentsPending ? 'Uploading' : 'Pending',
    });
  } catch (error) {
    console.error('POST /api/employee-profile', error);
    return NextResponse.json(
      { error: 'Could not submit personal profile.' },
      { status: 500 },
    );
  }
}
