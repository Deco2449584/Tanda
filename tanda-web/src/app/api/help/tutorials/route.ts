import { NextResponse } from 'next/server';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import {
  listHelpTutorialsForViewer,
  serializeHelpTutorials,
} from '@/lib/help/server/help-tutorials-service';

export async function GET(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const tutorials = await listHelpTutorialsForViewer(employee);
    return NextResponse.json({ tutorials: serializeHelpTutorials(tutorials) });
  } catch (error) {
    console.error('GET /api/help/tutorials', error);
    return NextResponse.json({ error: 'Could not load tutorials.' }, { status: 500 });
  }
}
