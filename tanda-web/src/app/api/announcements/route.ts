import { NextResponse } from 'next/server';
import {
  broadcastAnnouncement,
  listAnnouncements,
} from '@/lib/announcements/server/announcements-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import type {
  AnnouncementAudience,
  BroadcastAnnouncementInput,
} from '@/lib/types/announcement';

function parseAudience(value: unknown): AnnouncementAudience {
  if (value === 'department' || value === 'location') return value;
  return 'all';
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const announcements = await listAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('GET /api/announcements', error);
    return NextResponse.json(
      { error: 'Could not load announcements.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<BroadcastAnnouncementInput> & {
      createdByName?: string;
    };

    const announcement = await broadcastAnnouncement({
      payload: {
        title: body.title ?? '',
        body: body.body ?? '',
        audience: parseAudience(body.audience),
        audienceValue: body.audienceValue,
      },
      createdByEmail: admin.email,
      createdByName: body.createdByName,
    });

    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not send announcement.';
    console.error('POST /api/announcements', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
