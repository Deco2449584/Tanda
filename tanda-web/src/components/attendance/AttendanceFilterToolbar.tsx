'use client';

import type { ReactNode } from 'react';
import { Building2, MapPin, Search } from 'lucide-react';
import { AttendanceDateFilterBar } from '@/components/attendance/AttendanceDateFilterBar';
import type { DateRange } from '@/lib/attendance/date-range';

interface FilterOption {
  id: string;
  label: string;
}

interface AttendanceFilterToolbarProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  departmentOptions: FilterOption[];
  locationFilter: string;
  onLocationFilterChange: (value: string) => void;
  locationOptions: FilterOption[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  actions?: ReactNode;
}

export function AttendanceFilterToolbar({
  dateRange,
  onDateRangeChange,
  departmentFilter,
  onDepartmentFilterChange,
  departmentOptions,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  searchQuery,
  onSearchQueryChange,
  actions,
}: AttendanceFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
      <div className="min-w-0 flex-1">
        <AttendanceDateFilterBar
          dateRange={dateRange}
          onRangeChange={onDateRangeChange}
        />
      </div>

      <div className="relative w-full xl:w-52 xl:shrink-0">
        <Building2
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <select
          value={departmentFilter}
          onChange={(event) => onDepartmentFilterChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          aria-label="Filter by department"
        >
          {departmentOptions.map((department) => (
            <option
              key={department.id}
              value={department.id}
              className="bg-surface-raised"
            >
              {department.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative w-full xl:w-52 xl:shrink-0">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <select
          value={locationFilter}
          onChange={(event) => onLocationFilterChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          aria-label="Filter by location"
        >
          {locationOptions.map((location) => (
            <option
              key={location.id}
              value={location.id}
              className="bg-surface-raised"
            >
              {location.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative w-full xl:w-56 xl:shrink-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search employee..."
          className="w-full rounded-lg border border-border bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
        />
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center justify-end gap-2 xl:ml-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
