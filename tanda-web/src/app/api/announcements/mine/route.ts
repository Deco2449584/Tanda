import { NextResponse } from 'next/server';
import { listAnnouncementsForEmployee } from '@/lib/announcements/server/announcements-service';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';

export async function GET(request: Request) {
  try {
    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const announcements = await listAnnouncementsForEmployee(employee.email);
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('GET /api/announcements/mine', error);
    return NextResponse.json(
      { error: 'Could not load announcements.' },
      { status: 500 },
    );
  }
}
