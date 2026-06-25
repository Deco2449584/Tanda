'use client';

import { useLocations } from '@/providers/LocationsProvider';
import { getLocationLabel } from '@/lib/locations/format-location';

interface EmployeeLocationSelectProps {
  id: string;
  value: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowUnassigned?: boolean;
}

export function EmployeeLocationSelect({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  allowUnassigned = false,
}: EmployeeLocationSelectProps) {
  const { activeLocations, locations, loading } = useLocations();

  const options = activeLocations.length > 0 ? activeLocations : locations;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        Location
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        required={required && options.length > 0}
        className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
      >
        {allowUnassigned || !required ? (
          <option value="">Unassigned</option>
        ) : (
          <option value="" disabled>
            Select a location…
          </option>
        )}
        {options.length === 0 ? (
          <option value="" disabled>
            {loading ? 'Loading locations…' : 'No locations — create one in Settings'}
          </option>
        ) : (
          options.map((location) => (
            <option key={location.id} value={location.id}>
              {getLocationLabel(location.id, locations)}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
