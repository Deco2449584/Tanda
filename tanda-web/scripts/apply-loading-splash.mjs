import fs from 'node:fs';

const files = [
  'src/components/schedule/ScheduleGrid.tsx',
  'src/components/schedule/ScheduleMonthCalendar.tsx',
  'src/components/leave-requests/LeaveRequestHistoryTable.tsx',
  'src/components/inspections/InspectionsPageClient.tsx',
  'src/components/settings/PortalClientsTab.tsx',
  'src/components/settings/LocationsTab.tsx',
  'src/components/settings/KioskDevicesTab.tsx',
  'src/app/(protected)/inspections/page.tsx',
  'src/app/(protected)/inspections/[id]/page.tsx',
  'src/app/(protected)/my-schedule/page.tsx',
  'src/components/employee-dashboard/NextShiftCard.tsx',
  'src/components/employee-dashboard/RecentRecordsTable.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('LoadingIndicator')) {
    if (content.includes("'use client'")) {
      content = content.replace(
        "'use client';",
        "'use client';\n\nimport { LoadingIndicator } from '@/components/ui/LoadingSplash';",
      );
    } else {
      content = `import { LoadingIndicator } from '@/components/ui/LoadingSplash';\n${content}`;
    }
  }
  content = content.replace(
    /<p className="[^"]*">Loading[^<]*<\/p>/g,
    '<LoadingIndicator />',
  );
  content = content.replace(
    /Loading records\.\.\./g,
    '',
  );
  fs.writeFileSync(file, content, 'utf8');
  console.log('updated', file);
}
