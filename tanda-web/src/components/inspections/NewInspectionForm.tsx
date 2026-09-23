'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Barcode,
  Bus,
  Check,
  Images,
  MapPin,
  Nut,
  TriangleAlert,
} from 'lucide-react';
import { EvidencePhotosField } from '@/components/inspections/EvidencePhotosField';
import { EvidenceVideoField } from '@/components/inspections/EvidenceVideoField';
import {
  FieldLabel,
  FormSectionCard,
  OptionGroup,
} from '@/components/inspections/FormSectionCard';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  getUldKindLabel,
  getUnitTypeHint,
  getUnitTypeLabel,
  inferUnitTypeFromUldId,
  MANUAL_UNIT_TYPES,
  requiresUldId,
} from '@/lib/inspections/cargo-unit-type';
import {
  createCargoInspectionRecord,
  findInspectionByUldId,
} from '@/lib/inspections/create-inspection';
import { normalizeUldId } from '@/lib/inspections/normalize-uld-id';
import {
  captureRegistrationLocation,
  RegistrationLocationError,
} from '@/lib/inspections/capture-location';
import { enqueueInspectionMedia } from '@/lib/inspections/media-queue';
import {
  CONSERVATION_TYPES,
  type CargoUnitType,
  type ConservationType,
} from '@/lib/types/cargo-inspection';
import { useLocations } from '@/providers/LocationsProvider';

const CONSERVATION_OPTIONS = CONSERVATION_TYPES.map((value) => ({
  value,
  label: value,
}));

const MANUAL_UNIT_OPTIONS = MANUAL_UNIT_TYPES.map((value) => ({
  value,
  label: getUnitTypeLabel(value),
}));

function parseNonNegativeNumber(value: string): number {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function NewInspectionForm() {
  const router = useRouter();
  const { user } = useAuthRole();
  const { activeLocations, loading: clientsLoading, error: locationsError } =
    useLocations();

  const [uldId, setUldId] = useState('');
  const [manualUnitType, setManualUnitType] =
    useState<CargoUnitType>('pallet_skid');
  const [awbNumber, setAwbNumber] = useState('');
  const [clientLocationId, setClientLocationId] = useState('');
  const [conservationType, setConservationType] =
    useState<ConservationType>('Ambient');
  const [foodType, setFoodType] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [temperature, setTemperature] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [exitVehiclePlate, setExitVehiclePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transportCompany, setTransportCompany] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');

  const clients = activeLocations;
  const clientsError = locationsError;

  const inferredUnitType = useMemo(
    () => inferUnitTypeFromUldId(uldId),
    [uldId],
  );
  const unitType = inferredUnitType ?? manualUnitType;
  const uldKindLabel = useMemo(() => getUldKindLabel(uldId), [uldId]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientLocationId) ?? null,
    [clients, clientLocationId],
  );

  const singleClient = clients.length === 1 ? clients[0] : null;
  const effectiveClient = singleClient ?? selectedClient;

  function validate(): string | null {
    if (!user?.uid) {
      return 'You must be signed in to register cargo.';
    }
    if (requiresUldId(unitType) && !normalizeUldId(uldId)) {
      return 'Enter the ULD ID (e.g. AKE 12345 CX).';
    }
    if (!effectiveClient) {
      return clients.length === 0
        ? 'No active clients found. Add a client in Settings first.'
        : 'Select the client this cargo belongs to.';
    }
    if (!awbNumber.trim()) {
      return 'Enter the air waybill number.';
    }
    if (!foodType.trim()) {
      return 'Enter the type of food or product.';
    }
    if (hasIssues && !issueDescription.trim()) {
      return 'Describe the issue when damage or problems are reported.';
    }
    if (temperature.trim() && !Number.isFinite(Number(temperature))) {
      return 'Enter a valid temperature in °C, or leave the field empty.';
    }
    return null;
  }

  async function handleSubmit() {
    if (saving || !user?.uid) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const client = effectiveClient;
    if (!client) return;

    setError('');
    setSaving(true);

    try {
      const normalizedUld = normalizeUldId(uldId);

      if (normalizedUld) {
        setSavingMessage('Checking for duplicates…');
        const duplicate = await findInspectionByUldId(normalizedUld);
        if (duplicate) {
          setError(
            `${normalizedUld} is already on file${
              duplicate.awbNumber ? ` (AWB ${duplicate.awbNumber})` : ''
            }.`,
          );
          return;
        }
      }

      setSavingMessage('Capturing GPS position…');
      const geo = await captureRegistrationLocation();

      setSavingMessage('Saving inspection…');
      const created = await createCargoInspectionRecord(
        user.uid,
        user.email || '',
        {
          unitType,
          uldId: normalizedUld,
          awbNumber: awbNumber.trim(),
          conservationType,
          foodType: foodType.trim(),
          weightKg: parseNonNegativeNumber(weightKg),
          boxCount: Math.round(parseNonNegativeNumber(boxCount)),
          hasIssues,
          issueDescription: issueDescription.trim(),
          clientLocationId: client.id,
          clientLocationName: client.name,
          temperatureCelsius: temperature.trim()
            ? Number(temperature)
            : undefined,
          exitVehiclePlate: exitVehiclePlate.trim(),
          driverName: driverName.trim(),
          transportCompany: transportCompany.trim(),
        },
        geo,
        user.displayName || undefined,
      );

      enqueueInspectionMedia({
        inspectionId: created.id,
        userId: user.uid,
        label: normalizedUld || awbNumber.trim(),
        photos,
        videos,
      });

      router.replace('/inspections');
    } catch (submitError) {
      if (submitError instanceof RegistrationLocationError) {
        setError(submitError.message);
      } else {
        console.error('createCargoInspection', submitError);
        setError('Could not save the inspection. Please try again.');
      }
    } finally {
      setSaving(false);
      setSavingMessage('');
    }
  }

  return (
    <form
      className="mx-auto max-w-3xl space-y-4 pb-8"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-subtle">
        <MapPin className="h-3 w-3" aria-hidden />
        GPS is captured when you save
      </p>

      <FormSectionCard
        icon={Barcode}
        title="Identification"
        subtitle="ULD code and air waybill"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FieldLabel
            label={requiresUldId(unitType) ? 'ULD ID' : 'ULD ID (optional)'}
          >
            <Input
              value={uldId}
              onChange={(event) => setUldId(event.target.value)}
              placeholder={
                requiresUldId(unitType) ? 'AKE 12345 CX' : 'Optional reference'
              }
              autoCapitalize="characters"
              spellCheck={false}
            />
          </FieldLabel>

          <FieldLabel label="Air waybill (AWB)">
            <Input
              value={awbNumber}
              onChange={(event) => setAwbNumber(event.target.value)}
              placeholder="123-45678901"
              inputMode="numeric"
            />
          </FieldLabel>
        </div>

        {inferredUnitType ? (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
            <p className="text-xs font-semibold text-primary">
              Detected: {uldKindLabel ?? getUnitTypeLabel(inferredUnitType)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {getUnitTypeHint(inferredUnitType)}
            </p>
          </div>
        ) : (
          <OptionGroup
            label="Cargo category"
            options={MANUAL_UNIT_OPTIONS}
            value={manualUnitType}
            onChange={setManualUnitType}
            hint={getUnitTypeHint(manualUnitType)}
          />
        )}

        {clientsLoading ? (
          <p className="text-xs text-subtle">Loading clients…</p>
        ) : clientsError ? (
          <p className="text-xs text-danger">{clientsError}</p>
        ) : clients.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            No active clients found. Add a client in Settings first.
          </p>
        ) : singleClient ? (
          <FieldLabel label="Client">
            <Input value={singleClient.name} readOnly disabled />
          </FieldLabel>
        ) : (
          <FieldLabel label="Client">
            <select
              value={clientLocationId}
              onChange={(event) => setClientLocationId(event.target.value)}
              className="h-10 w-full rounded-lg border border-border-strong bg-surface-base px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select a client…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </FieldLabel>
        )}
      </FormSectionCard>

      <FormSectionCard
        icon={Nut}
        title="Cargo details"
        subtitle="Product, conservation, weight, and condition"
      >
        <OptionGroup
          label="Conservation type"
          options={CONSERVATION_OPTIONS}
          value={conservationType}
          onChange={setConservationType}
        />

        <FieldLabel label="Food type">
          <Input
            value={foodType}
            onChange={(event) => setFoodType(event.target.value)}
            placeholder="e.g. FRESH SALMON"
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <FieldLabel label="Weight (kg)">
            <Input
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
          </FieldLabel>
          <FieldLabel label="Box count">
            <Input
              value={boxCount}
              onChange={(event) => setBoxCount(event.target.value)}
              placeholder="0"
              inputMode="numeric"
            />
          </FieldLabel>
          <FieldLabel label="Temperature (°C)">
            <Input
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              placeholder="Optional"
              inputMode="decimal"
            />
          </FieldLabel>
        </div>

        <div className="rounded-lg border border-border-strong bg-surface-base p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Damage / issues detected?
              </p>
              <p className="mt-1 text-xs text-subtle">
                Turn on for damage, temperature breach, or documentation problems
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hasIssues}
              aria-label="Damage or issues detected"
              onClick={() => setHasIssues((current) => !current)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                hasIssues ? 'bg-amber-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  hasIssues ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {hasIssues ? (
            <Textarea
              value={issueDescription}
              onChange={(event) => setIssueDescription(event.target.value)}
              rows={3}
              placeholder="Describe the issue found during inspection..."
              className="mt-3"
            />
          ) : null}
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={Bus}
        title="Outbound transport"
        subtitle="Optional — truck, driver, and carrier"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FieldLabel label="Exit vehicle plate">
            <Input
              value={exitVehiclePlate}
              onChange={(event) => setExitVehiclePlate(event.target.value)}
              placeholder="e.g. ABC-123"
              autoCapitalize="characters"
            />
          </FieldLabel>
          <FieldLabel label="Driver name">
            <Input
              value={driverName}
              onChange={(event) => setDriverName(event.target.value)}
              placeholder="Driver full name"
            />
          </FieldLabel>
          <FieldLabel label="Transport company">
            <Input
              value={transportCompany}
              onChange={(event) => setTransportCompany(event.target.value)}
              placeholder="Carrier / haulage company"
            />
          </FieldLabel>
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={Images}
        title="Evidence"
        subtitle="Photos and video clips from the inspection"
      >
        <EvidencePhotosField
          files={photos}
          onChange={setPhotos}
          onError={setError}
          disabled={saving}
        />
        <EvidenceVideoField
          files={videos}
          onChange={setVideos}
          onError={setError}
          disabled={saving}
        />
      </FormSectionCard>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-primary/90 disabled:opacity-60 md:w-auto md:min-w-[220px]"
      >
        <Check className="h-4 w-4" aria-hidden />
        {saving ? savingMessage || 'Saving…' : 'Save inspection'}
      </button>

      <p className="text-xs text-subtle md:text-center">
        The inspection saves right away. Photos and videos keep uploading in the
        background — keep this tab open until the progress bar finishes.
      </p>
    </form>
  );
}
