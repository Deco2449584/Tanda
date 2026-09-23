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
import { CargoTypeIconStrip } from '@/components/inspections/CargoTypeIconStrip';
import { ClientChipRow } from '@/components/inspections/ClientChipRow';
import { ConservationPills } from '@/components/inspections/ConservationPills';
import { EvidencePhotosField } from '@/components/inspections/EvidencePhotosField';
import { EvidenceVideoField } from '@/components/inspections/EvidenceVideoField';
import {
  FieldLabel,
  FormSectionCard,
  FormSwitch,
} from '@/components/inspections/FormSectionCard';
import { MetricSlider } from '@/components/inspections/MetricSlider';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  getUldKindLabel,
  getUnitTypeHint,
  getUnitTypeLabel,
  inferUnitTypeFromUldId,
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
import { type CargoUnitType, type ConservationType } from '@/lib/types/cargo-inspection';
import { useLocations } from '@/providers/LocationsProvider';

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
  const [weightKg, setWeightKg] = useState(0);
  const [boxCount, setBoxCount] = useState(0);
  const [temperature, setTemperature] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [showDriverFields, setShowDriverFields] = useState(false);
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
    if (!normalizeUldId(uldId)) {
      return 'Enter the identification number (e.g. AKE 12345 CX).';
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
          weightKg,
          boxCount,
          hasIssues,
          issueDescription: hasIssues ? issueDescription.trim() : '',
          clientLocationId: client.id,
          clientLocationName: client.name,
          temperatureCelsius: temperature.trim()
            ? Number(temperature)
            : undefined,
          exitVehiclePlate: showDriverFields ? exitVehiclePlate.trim() : '',
          driverName: showDriverFields ? driverName.trim() : '',
          transportCompany: showDriverFields ? transportCompany.trim() : '',
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
          <FieldLabel label="ULD ID">
            <Input
              value={uldId}
              onChange={(event) => setUldId(event.target.value)}
              placeholder="AKE 12345 CX"
              autoCapitalize="characters"
              spellCheck={false}
              required
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
          <div className="space-y-2">
            <CargoTypeIconStrip value={manualUnitType} onChange={setManualUnitType} />
            <p className="text-xs text-muted">{getUnitTypeHint(manualUnitType)}</p>
          </div>
        )}

        {clientsLoading ? (
          <p className="text-xs text-subtle">Loading clients…</p>
        ) : clientsError ? (
          <p className="text-xs text-danger">{clientsError}</p>
        ) : clients.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            No active clients found. Add a client in Settings first.
          </p>
        ) : (
          <ClientChipRow
            clients={clients}
            selectedId={effectiveClient?.id ?? ''}
            onChange={(client) => setClientLocationId(client?.id ?? '')}
          />
        )}
      </FormSectionCard>

      <FormSectionCard
        icon={Nut}
        title="Cargo details"
        subtitle="Product, conservation, weight, and condition"
      >
        <ConservationPills value={conservationType} onChange={setConservationType} />

        <FieldLabel label="Food type">
          <Input
            value={foodType}
            onChange={(event) => setFoodType(event.target.value)}
            placeholder="e.g. FRESH SALMON"
          />
        </FieldLabel>

        <MetricSlider
          label="Weight (kg)"
          value={weightKg}
          max={5000}
          unit="kg"
          onChange={setWeightKg}
        />
        <MetricSlider
          label="Box count"
          value={boxCount}
          max={200}
          unit="boxes"
          onChange={setBoxCount}
        />

        <FieldLabel label="Temperature (°C)">
          <Input
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            placeholder="Optional"
            inputMode="decimal"
          />
        </FieldLabel>

        <FormSwitch
          id="has-issues"
          checked={hasIssues}
          onChange={setHasIssues}
          label="Damage / issues detected?"
          hint="Turn on for damage, temperature breach, or documentation problems"
          onClassName="peer-checked:bg-amber-500"
        />

        {hasIssues ? (
          <Textarea
            value={issueDescription}
            onChange={(event) => setIssueDescription(event.target.value)}
            rows={3}
            placeholder="Describe the issue found during inspection..."
          />
        ) : null}
      </FormSectionCard>

      <FormSectionCard
        icon={Bus}
        title="Outbound transport"
        subtitle="Optional — truck, driver, and carrier"
      >
        <FormSwitch
          id="show-driver-fields"
          checked={showDriverFields}
          onChange={setShowDriverFields}
          label="Add driver / transport details?"
          hint="Turn on to enter vehicle plate, driver name, and carrier"
        />

        {showDriverFields ? (
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
        ) : null}
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
