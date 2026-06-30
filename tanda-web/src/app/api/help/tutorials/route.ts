import { NextResponse } from 'next/server';
import { resolveHelpTutorialCategories } from '@/lib/help/help-tutorial-categories';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { listHelpTutorialCategories } from '@/lib/help/server/help-tutorial-categories-service';
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

    const [tutorials, allCategories] = await Promise.all([
      listHelpTutorialsForViewer(employee),
      listHelpTutorialCategories(),
    ]);

    const visibleCategories = resolveHelpTutorialCategories(
      allCategories,
      tutorials.map((tutorial) => tutorial.category),
    );

    return NextResponse.json({
      tutorials: serializeHelpTutorials(tutorials),
      categories: visibleCategories,
    });
  } catch (error) {
    console.error('GET /api/help/tutorials', error);
    return NextResponse.json({ error: 'Could not load tutorials.' }, { status: 500 });
  }
}
