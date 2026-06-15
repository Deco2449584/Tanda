import { NextResponse } from 'next/server';
import {
  getBearerToken,
  verifyPortalSessionToken,
} from '@/lib/portal/session';
import { fetchPortalInspections } from '@/lib/portal/server-inspections';

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request.headers.get('authorization'));
    if (!token) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const session = await verifyPortalSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Sesión expirada.' }, { status: 401 });
    }

    const inspections = await fetchPortalInspections(session);

    return NextResponse.json({
      awbNumber: session.awbNumber,
      inspections: inspections.map((inspection) => ({
        id: inspection.id,
        uldId: inspection.uldId,
        awbNumber: inspection.awbNumber,
        status: inspection.status,
        hasIssues: inspection.hasIssues,
        conservationType: inspection.conservationType,
        foodType: inspection.foodType,
        weightKg: inspection.weightKg,
        boxCount: inspection.boxCount,
        registeredAt: inspection.registeredAt,
        updatedAt: inspection.updatedAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/portal/inspections', error);
    return NextResponse.json(
      { error: 'No se pudieron cargar las inspecciones.' },
      { status: 500 },
    );
  }
}
