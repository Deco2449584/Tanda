'use client';

import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { formatLocationGroupSites } from '@/lib/location-groups/format-location-group';
import { useLocations } from '@/providers/LocationsProvider';

interface EmployeeLocationGroupSelectProps {
  value: string;
  onChange: (locationGroupId: string) => void;
  disabled?: boolean;
  id?: string;
}

export function EmployeeLocationGroupSelect({
  value,
  onChange,
  disabled = false,
  id = 'employee-location-group',
}: EmployeeLocationGroupSelectProps) {
  const { activeGroups, groups } = useLocationGroups();
  const { locations } = useLocations();
  const options = activeGroups.length > 0 ? activeGroups : groups;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        Location group <span className="text-subtle">(optional)</span>
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || options.length === 0}
        className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
      >
        <option value="">No group — primary site only</option>
        {options.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} — {formatLocationGroupSites(group, locations)}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="mt-1 text-xs text-subtle">
          Groups are optional. Assign a primary location above.
        </p>
      ) : null}
    </div>
  );
}
