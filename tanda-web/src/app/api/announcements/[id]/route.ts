import { NextResponse } from 'next/server';
import {
  employeeCanReadAnnouncement,
  getAnnouncementById,
} from '@/lib/announcements/server/announcements-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const announcement = await getAnnouncementById(id);

    if (!announcement) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }

    const admin = await verifyAdminRequest(request);
    if (admin) {
      return NextResponse.json({ announcement });
    }

    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const allowed = await employeeCanReadAnnouncement(id, employee.email);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('GET /api/announcements/[id]', error);
    return NextResponse.json(
      { error: 'Could not load announcement.' },
      { status: 500 },
    );
  }
}
