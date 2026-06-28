'use client';

import { useDepartments } from '@/providers/DepartmentsProvider';

interface EmployeeDepartmentSelectProps {
  id: string;
  value: string;
  onChange: (departmentName: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowUnassigned?: boolean;
}

export function EmployeeDepartmentSelect({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  allowUnassigned = true,
}: EmployeeDepartmentSelectProps) {
  const { activeDepartments, departments, loading } = useDepartments();
  const options = activeDepartments.length > 0 ? activeDepartments : departments;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        Department
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading}
        required={required && options.length > 0}
        className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
      >
        {allowUnassigned || !required ? (
          <option value="">No department</option>
        ) : (
          <option value="" disabled>
            Select a department…
          </option>
        )}
        {options.length === 0 ? (
          <option value="" disabled>
            {loading ? 'Loading departments…' : 'No departments — create one in Settings'}
          </option>
        ) : null}
        {value && !options.some((item) => item.name === value) ? (
          <option value={value}>{value} (legacy)</option>
        ) : null}
        {options.map((department) => (
          <option key={department.id} value={department.name}>
            {department.name}
          </option>
        ))}
      </select>
    </div>
  );
}
