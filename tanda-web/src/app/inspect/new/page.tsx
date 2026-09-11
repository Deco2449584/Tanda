import { InspectScreenHeader } from '@/components/inspect/InspectScreenHeader';
import { NewInspectionForm } from '@/components/inspect/NewInspectionForm';
import { INSPECT_BRAND } from '@/lib/inspect/brand';

export default function NewInspectionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <InspectScreenHeader
        title="New inspection"
        subtitle={INSPECT_BRAND.company}
        backHref="/inspect"
      />
      <NewInspectionForm />
    </div>
  );
}
