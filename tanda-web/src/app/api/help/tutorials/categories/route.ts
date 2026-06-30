import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  addHelpTutorialCategory,
  listHelpTutorialCategories,
} from '@/lib/help/server/help-tutorial-categories-service';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const categories = await listHelpTutorialCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('GET /api/help/tutorials/categories', error);
    return NextResponse.json(
      { error: 'Could not load categories.' },
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

    const body = (await request.json()) as { name?: string };
    const categories = await addHelpTutorialCategory(body.name ?? '');
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('POST /api/help/tutorials/categories', error);
    const message =
      error instanceof Error ? error.message : 'Could not add category.';
    const status = message.includes('already exists') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
