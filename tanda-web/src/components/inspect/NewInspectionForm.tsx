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
import { EvidencePhotosField } from '@/components/inspect/EvidencePhotosField';
import { EvidenceVideoField } from '@/components/inspect/EvidenceVideoField';
import {
  FieldLabel,
  FormSectionCard,
  OptionGroup,
} from '@/components/inspect/FormSectionCard';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
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
} from '@/lib/inspect/capture-location';
import { enqueueInspectionMedia } from '@/lib/inspect/media-queue';
import {
  CONSERVATION_TYPES,
  type CargoUnitType,
  type ConservationType,
} from '@/lib/types/cargo-inspection';
import { useInspectSession } from '@/providers/InspectSessionProvider';

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
  const { user, employee, clients, clientsLoading, clientsError } =
    useInspectSession();

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
    if (requiresUldId(unitType) && !normalizeUldId(uldId)) {
      return 'Enter or scan the ULD ID (e.g. AKE 12345 CX).';
    }
    if (!effectiveClient) {
      return clients.length === 0
        ? 'No client assigned — contact an administrator.'
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
    if (saving) return;

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
        employee?.email || user.email || '',
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
      );

      enqueueInspectionMedia({
        inspectionId: created.id,
        userId: user.uid,
        label: normalizedUld || awbNumber.trim(),
        photos,
        videos,
      });

      router.replace('/inspect');
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
      className="space-y-4 px-4 pb-8"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Warehouse intake
        </p>
        <h2 className="mt-1.5 font-display text-xl font-normal tracking-wide text-foreground">
          Register cargo
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Capture identification, commodity details, and evidence before the unit
          moves to dispatch.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-base/60 px-2.5 py-1 text-[11px] font-medium text-subtle">
          <MapPin className="h-3 w-3" aria-hidden />
          GPS is captured when you save
        </p>
      </section>

      <FormSectionCard
        icon={Barcode}
        title="Identification"
        subtitle="ULD code and air waybill"
      >
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

        <FieldLabel label="Air waybill (AWB)">
          <Input
            value={awbNumber}
            onChange={(event) => setAwbNumber(event.target.value)}
            placeholder="123-45678901"
            inputMode="numeric"
          />
        </FieldLabel>

        {clientsLoading ? (
          <p className="text-xs text-subtle">Loading assigned clients…</p>
        ) : clientsError ? (
          <p className="text-xs text-danger">{clientsError}</p>
        ) : clients.length === 0 ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            No client assigned — ask an administrator to link your account to a
            client site.
          </p>
        ) : singleClient ? (
          <FieldLabel label="Client">
            <Input value={singleClient.name} readOnly disabled />
          </FieldLabel>
        ) : (
          <OptionGroup
            label="Client"
            options={clients.map((client) => ({
              value: client.id,
              label: client.name,
            }))}
            value={clientLocationId}
            onChange={setClientLocationId}
          />
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

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        <FieldLabel label="Temperature (°C) — optional">
          <Input
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            placeholder="e.g. -18 or 4"
            inputMode="decimal"
          />
        </FieldLabel>

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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold tracking-wide text-white transition hover:bg-primary/90 disabled:opacity-60"
      >
        <Check className="h-4 w-4" aria-hidden />
        {saving ? savingMessage || 'Saving…' : 'Save inspection'}
      </button>

      <p className="text-center text-xs text-subtle">
        Photos and videos keep uploading in the background after you save. Keep
        this tab open until they finish.
      </p>
    </form>
  );
}
