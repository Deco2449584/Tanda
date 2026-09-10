'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { isWorkforceEmployee } from '@/lib/employees/is-workforce-employee';
import type { Employee } from '@/lib/types/employee';

interface CourseAssigneePickerProps {
  employees: Employee[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Already enrolled — shown checked + locked or still selectable for re-assign skip */
  alreadyAssignedIds?: Set<string>;
  title?: string;
}

export function CourseAssigneePicker({
  employees,
  selectedIds,
  onChange,
  disabled = false,
  alreadyAssignedIds,
  title = 'Assign to',
}: CourseAssigneePickerProps) {
  const [query, setQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const workforce = useMemo(
    () =>
      employees
        .filter((employee) => isWorkforceEmployee(employee))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );

  const departments = useMemo(() => {
    const values = new Set<string>();
    workforce.forEach((employee) => {
      const department = employee.department?.trim();
      if (department) values.add(department);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [workforce]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return workforce.filter((employee) => {
      if (
        departmentFilter !== 'all' &&
        (employee.department?.trim() ?? '') !== departmentFilter
      ) {
        return false;
      }
      if (!needle) return true;
      return (
        employee.name.toLowerCase().includes(needle) ||
        employee.employeeId.toLowerCase().includes(needle) ||
        (employee.email ?? '').toLowerCase().includes(needle) ||
        (employee.department ?? '').toLowerCase().includes(needle)
      );
    });
  }, [workforce, query, departmentFilter]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectVisible() {
    const next = new Set(selectedIds);
    filtered.forEach((employee) => next.add(employee.id));
    onChange(Array.from(next));
  }

  function clearVisible() {
    const visible = new Set(filtered.map((employee) => employee.id));
    onChange(selectedIds.filter((id) => !visible.has(id)));
  }

  function selectAllWorkforce() {
    onChange(workforce.map((employee) => employee.id));
  }

  return (
    <div className="min-w-0 space-y-3 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted">{title}</p>
          <p className="mt-0.5 text-[11px] text-subtle">
            {selectedIds.length} selected
            {alreadyAssignedIds && alreadyAssignedIds.size > 0
              ? ` · ${alreadyAssignedIds.size} already enrolled`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={disabled || workforce.length === 0}
            onClick={selectAllWorkforce}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-50"
          >
            Everyone
          </button>
          <button
            type="button"
            disabled={disabled || filtered.length === 0}
            onClick={selectVisible}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-50"
          >
            Select visible
          </button>
          <button
            type="button"
            disabled={disabled || selectedIds.length === 0}
            onClick={clearVisible}
            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted hover:text-foreground disabled:opacity-50"
          >
            Clear visible
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <label className="relative block min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, code, email…"
            className="w-full rounded-lg border border-border bg-surface-base py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
          />
        </label>
        <select
          value={departmentFilter}
          disabled={disabled}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-50"
        >
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-border bg-surface-base/50">
        {filtered.length === 0 ? (
          <p className="flex items-center gap-2 px-3 py-6 text-xs text-muted">
            <Users className="h-4 w-4" />
            No matching employees.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((employee) => {
              const checked = selectedSet.has(employee.id);
              const already = alreadyAssignedIds?.has(employee.id) === true;

              return (
                <li key={employee.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-hover/40">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(employee.id)}
                      className="h-4 w-4 rounded border-zinc-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {employee.name}
                        {already ? (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-subtle">
                            enrolled
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-[11px] text-subtle">
                        {employee.employeeId}
                        {employee.department ? ` · ${employee.department}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
