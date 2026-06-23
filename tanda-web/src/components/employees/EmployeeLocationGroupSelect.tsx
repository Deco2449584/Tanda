'use client';

import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { formatLocationGroupSites } from '@/lib/location-groups/format-location-group';
import { useLocations } from '@/providers/LocationsProvider';

interface EmployeeLocationGroupSelectProps {
  value: string;
  onChange: (locationGroupId: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function EmployeeLocationGroupSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  id = 'employee-location-group',
}: EmployeeLocationGroupSelectProps) {
  const { activeGroups, groups } = useLocationGroups();
  const { locations } = useLocations();
  const options = activeGroups.length > 0 ? activeGroups : groups;

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || options.length === 0}
      required={required}
      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
    >
      <option value="">Select location group…</option>
      {options.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name} — {formatLocationGroupSites(group, locations)}
        </option>
      ))}
    </select>
  );
}
