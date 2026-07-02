'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteField, doc, updateDoc } from 'firebase/firestore';
import { X } from 'lucide-react';
import { EmployeeLocationSelect } from '@/components/employees/EmployeeLocationSelect';
import { COLLECTIONS } from '@/lib/constants';
import { isOnOrAfterToday } from '@/lib/dates/input-date';
import { db } from '@/lib/firebase';
import { notifyShiftChange } from '@/lib/notifications/client-notify';
import { recordShiftAuditEvent } from '@/lib/audit/audit-logs-client';
import {
  getAllowedLocationsForEmployee,
  isLocationAllowedForEmployee,
} from '@/lib/location-groups/can-punch-at-location';
import { useLocations } from '@/providers/LocationsProvider';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';
import type { AssignShiftInput } from '@/lib/types/shift';

interface AssignShiftModalProps {
  open: boolean;
  initialData: AssignShiftInput | null;
  employees: Employee[];
  onClose: () => void;
}

const emptyForm: Omit<AssignShiftInput, 'employeeId' | 'employeeName' | 'date'> = {
  startTime: '09:00',
  endTime: '17:00',
  locationId: '',
};

function resolveEmployeeShiftLocation(
  employee: Employee,
  preferredLocationId: string | undefined,
  locations: readonly Location[],
  groups: readonly LocationGroup[],
): string {
  const allowed = getAllowedLocationsForEmployee(employee, locations, groups);
  const preferred = preferredLocationId?.trim();

  if (preferred && allowed.some((location) => location.id === preferred)) {
    return preferred;
  }

  const assignedLocationId = employee.locationId?.trim();
  if (
    assignedLocationId &&
    allowed.some((location) => location.id === assignedLocationId)
  ) {
    return assignedLocationId;
  }

  return allowed[0]?.id ?? '';
}

export function AssignShiftModal({
  open,
  initialData,
  employees,
  onClose,
}: AssignShiftModalProps) {
  const { locations } = useLocations();
  const { groups } = useLocationGroups();
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState(emptyForm.startTime);
  const [endTime, setEndTime] = useState(emptyForm.endTime);
  const [locationId, setLocationId] = useState(emptyForm.locationId ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !initialData) return;

    setEmployeeId(initialData.employeeId);
    setStartTime(initialData.startTime || emptyForm.startTime);
    setEndTime(initialData.endTime || emptyForm.endTime);
    setError('');

    const employee = employees.find((item) => item.employeeId === initialData.employeeId);
    if (employee) {
      setLocationId(
        resolveEmployeeShiftLocation(
          employee,
          initialData.locationId,
          locations,
          groups,
        ),
      );
    } else {
      setLocationId(initialData.locationId ?? emptyForm.locationId ?? '');
    }
  }, [open, initialData, employees, locations, groups]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employeeId === employeeId),
    [employees, employeeId],
  );

  const allowedLocations = useMemo(() => {
    if (!selectedEmployee) return [];
    return getAllowedLocationsForEmployee(selectedEmployee, locations, groups);
  }, [selectedEmployee, locations, groups]);

  const allowedLocationIds = useMemo(
    () => allowedLocations.map((location) => location.id),
    [allowedLocations],
  );

  if (!open || !initialData) return null;

  const employeeName = selectedEmployee?.name ?? initialData.employeeName;
  const isPastDate = !isOnOrAfterToday(initialData.date);
  const isEditing = Boolean(initialData.shiftId?.trim());

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  function handleEmployeeChange(nextId: string) {
    setEmployeeId(nextId);
    const employee = employees.find((e) => e.employeeId === nextId);
    if (employee) {
      setLocationId(resolveEmployeeShiftLocation(employee, undefined, locations, groups));
    } else {
      setLocationId('');
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const shiftDate = initialData?.date;
    if (!shiftDate) return;

    if (!isOnOrAfterToday(shiftDate)) {
      setError('Shifts cannot be scheduled on past dates.');
      return;
    }

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!employeeId.trim()) {
      setError('Select an employee.');
      return;
    }

    if (!locationId.trim()) {
      setError('Select a location.');
      return;
    }

    if (!selectedEmployee) {
      setError('Select an employee.');
      return;
    }

    if (allowedLocations.length === 0) {
      setError(
        'This employee has no assigned location or location group. Update their profile before scheduling.',
      );
      return;
    }

    if (!isLocationAllowedForEmployee(selectedEmployee, locationId, groups)) {
      setError('This location is not assigned to the selected employee.');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    const selectedLocation = locations.find((location) => location.id === locationId);

    const employeeDepartment = selectedEmployee.department?.trim() ?? '';
    const locationLabel = selectedLocation
      ? selectedLocation.city
        ? `${selectedLocation.name} (${selectedLocation.city})`
        : selectedLocation.name
      : '';

    setIsSubmitting(true);

    try {
      const payload = {
        employeeId: employeeId.trim(),
        date: shiftDate,
        startTime,
        endTime,
        department: employeeDepartment,
        locationId: locationId.trim(),
        locationNameSnapshot: selectedLocation?.name ?? '',
        locationCitySnapshot: selectedLocation?.city ?? '',
        status: 'scheduled' as const,
        confirmationStatus: 'pending' as const,
      };

      if (isEditing && initialData.shiftId) {
        await updateDoc(doc(db, COLLECTIONS.SHIFTS, initialData.shiftId), {
          ...payload,
          confirmationNote: deleteField(),
          confirmedAt: deleteField(),
        });

        void notifyShiftChange({
          type: 'assigned',
          employeeId: employeeId.trim(),
          shiftId: initialData.shiftId,
          date: shiftDate,
          startTime,
          endTime,
          department: employeeDepartment,
          locationLabel,
        });

        void recordShiftAuditEvent({
          action: 'shift.updated',
          shiftId: initialData.shiftId,
          summary: `Updated shift for ${employeeName} on ${shiftDate} (${startTime}–${endTime})`,
          after: payload,
        });
      } else {
        const shiftRef = await addDoc(collection(db, COLLECTIONS.SHIFTS), payload);

        void notifyShiftChange({
          type: 'assigned',
          employeeId: employeeId.trim(),
          shiftId: shiftRef.id,
          date: shiftDate,
          startTime,
          endTime,
          department: employeeDepartment,
          locationLabel,
        });

        void recordShiftAuditEvent({
          action: 'shift.created',
          shiftId: shiftRef.id,
          summary: `Assigned shift for ${employeeName} on ${shiftDate} (${startTime}–${endTime})`,
          after: payload,
        });
      }

      onClose();
    } catch {
      setError(
        isEditing
          ? 'Could not update the shift. Please try again.'
          : 'Could not assign the shift. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={handleClose}
      />

      <div className="relative z-10 w-[95%] rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Edit shift' : 'Assign shift'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-surface-base/60 px-3 py-2.5 text-sm">
          <p className="text-muted">
            <span className="text-subtle">Date:</span> {initialData.date}
          </p>
        </div>

        {isPastDate ? (
          <p className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2.5 text-sm text-amber-300">
            This date is in the past. Shifts can only be scheduled for today or
            future dates.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="shift-employee" className="mb-1.5 block text-sm text-muted">
              Employee
            </label>
            <select
              id="shift-employee"
              required
              value={employeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              disabled={isSubmitting || employees.length === 0 || isPastDate}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
            >
              <option value="">Select employee…</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.employeeId}>
                  {employee.name} ({employee.employeeId})
                </option>
              ))}
            </select>
            {employeeName && employeeId ? (
              <p className="mt-1 text-xs text-subtle">Assigning to {employeeName}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-start" className="mb-1.5 block text-sm text-muted">
                Start time
              </label>
              <input
                id="shift-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting || isPastDate}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="mb-1.5 block text-sm text-muted">
                End time
              </label>
              <input
                id="shift-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting || isPastDate}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>

          <EmployeeLocationSelect
            id="shift-location"
            value={locationId}
            onChange={setLocationId}
            disabled={isSubmitting || isPastDate || !selectedEmployee}
            required
            allowedLocationIds={selectedEmployee ? allowedLocationIds : []}
          />
          {selectedEmployee && allowedLocations.length === 0 ? (
            <p className="text-xs text-amber-300">
              Assign a location or location group to this employee in their profile
              before scheduling shifts.
            </p>
          ) : null}

          {error ? (
            <p
              className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2.5 text-center text-sm font-semibold text-red-300"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPastDate || allowedLocations.length === 0}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white hover:opacity-90 disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Assign shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
