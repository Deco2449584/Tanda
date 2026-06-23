'use client';

import { useEffect, useState } from 'react';
import { Layers, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import {
  createLocationGroup,
  deleteLocationGroup,
  migrateEmployeesToLocationGroups,
  setLocationGroupActive,
  subscribeLocationGroups,
  updateLocationGroup,
} from '@/lib/location-groups/location-groups-service';
import { formatLocationGroupSites } from '@/lib/location-groups/format-location-group';
import { subscribeLocations } from '@/lib/locations/locations-service';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';

interface LocationGroupsTabProps {
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

export function LocationGroupsTab({ onToast }: LocationGroupsTabProps) {
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationIds, setEditLocationIds] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);

  const activeLocations = locations.filter((location) => location.active);

  useEffect(() => {
    const unsubGroups = subscribeLocationGroups(
      (data) => {
        setGroups(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
        onToast('Could not load location groups.', 'error');
      },
    );
    const unsubLocations = subscribeLocations(setLocations);

    return () => {
      unsubGroups();
      unsubLocations();
    };
  }, [onToast]);

  function toggleLocation(id: string, current: string[], setter: (ids: string[]) => void) {
    if (current.includes(id)) {
      setter(current.filter((item) => item !== id));
      return;
    }
    setter([...current, id]);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await createLocationGroup({ name, locationIds: selectedLocationIds });
      setName('');
      setSelectedLocationIds([]);
      onToast('Location group created.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not create group.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(group: LocationGroup) {
    setEditingId(group.id);
    setEditName(group.name);
    setEditLocationIds(group.locationIds);
  }

  async function handleSaveEdit(groupId: string) {
    setSaving(true);
    try {
      await updateLocationGroup(groupId, {
        name: editName,
        locationIds: editLocationIds,
      });
      setEditingId(null);
      onToast('Location group updated.');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not update group.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    try {
      const result = await migrateEmployeesToLocationGroups();
      onToast(
        `Migration complete: ${result.groupsCreated} group(s), ${result.employeesUpdated} employee(s) updated.`,
      );
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Migration failed.', 'error');
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-4 flex items-start gap-3">
          <Layers className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-white">Location groups</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Assign employees to one or more warehouses. Kiosk devices only accept
              punches when the terminal warehouse is included in the employee group.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={migrating}
          onClick={() => void handleMigrate()}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {migrating ? 'Migrating…' : 'Migrate legacy single-location employees'}
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">New group</h3>
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name (e.g. Sydney ops)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white"
            required
          />
          <LocationCheckboxList
            locations={activeLocations}
            selectedIds={selectedLocationIds}
            onToggle={(id) => toggleLocation(id, selectedLocationIds, setSelectedLocationIds)}
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Saving…' : 'Create group'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Registered groups</h3>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-zinc-500">No location groups yet.</p>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li
                key={group.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
              >
                {editingId === group.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                    <LocationCheckboxList
                      locations={activeLocations}
                      selectedIds={editLocationIds}
                      onToggle={(id) => toggleLocation(id, editLocationIds, setEditLocationIds)}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(group.id)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{group.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatLocationGroupSites(group, locations)}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          group.active
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {group.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(group)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        aria-label="Edit group"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void setLocationGroupActive(group.id, !group.active).then(() =>
                            onToast(group.active ? 'Group deactivated.' : 'Group activated.'),
                          )
                        }
                        className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                      >
                        {group.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteLocationGroup(group.id)
                            .then(() => onToast('Group deleted.'))
                            .catch((error) =>
                              onToast(
                                error instanceof Error ? error.message : 'Delete failed.',
                                'error',
                              ),
                            )
                        }
                        className="rounded-lg p-2 text-red-400 hover:bg-red-950/40"
                        aria-label="Delete group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LocationCheckboxList({
  locations,
  selectedIds,
  onToggle,
}: {
  locations: Location[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (locations.length === 0) {
    return <p className="text-xs text-amber-400">Create at least one active location first.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {locations.map((location) => {
        const checked = selectedIds.includes(location.id);
        const label = location.city ? `${location.name} (${location.city})` : location.name;
        return (
          <label
            key={location.id}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              checked ? 'border-primary/50 bg-primary/10 text-white' : 'border-zinc-800 text-zinc-400'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(location.id)}
              className="accent-primary"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
