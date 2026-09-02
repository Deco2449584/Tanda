'use client';

import {
  baseHourlyRateFromCells,
  rateMatrixRows,
  readRateCell,
  writeRateCell,
} from '@/lib/payroll/rate-matrix';
import {
  BASE_BAND_ID,
  type PayRateCell,
  type PayRateCells,
  type PayRules,
} from '@/lib/types/pay-rules';
import { OverrideValueField, type OverrideMode } from '@/components/accounting/OverrideValueField';

const selectClass =
  'shrink-0 rounded-lg border border-border-strong bg-surface-base px-1.5 py-1.5 text-xs text-muted outline-none focus:border-primary disabled:opacity-50';

const inputClass =
  'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-2 py-1.5 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60';

interface RateMatrixEditorProps {
  rules: PayRules;
  cells: PayRateCells | undefined;
  onChange: (cells: PayRateCells) => void;
  disabled?: boolean;
  emptyHint?: string;
  emptyCellLabel?: string;
  /** Used when a weekday base cell switches to Edit with no stored override. */
  baseRateHint?: number;
}

function cellHasOverride(cell: PayRateCell): boolean {
  return typeof cell.rate === 'number' || typeof cell.percent === 'number';
}

function resolveCustomSeed(
  rules: PayRules,
  cells: PayRateCells | undefined,
  dayTypeId: string,
  bandId: string,
  baseRateHint: number,
): PayRateCell {
  const existing = readRateCell(cells, dayTypeId, bandId);
  if (cellHasOverride(existing)) return existing;

  const company = readRateCell(rules.defaultPayCells, dayTypeId, bandId);
  if (typeof company.percent === 'number') {
    return { percent: company.percent };
  }
  if (typeof company.rate === 'number') {
    return { rate: company.rate };
  }

  if (dayTypeId === 'weekday' && bandId === BASE_BAND_ID && baseRateHint > 0) {
    return { rate: baseRateHint };
  }

  return { rate: 0 };
}

function RateCellInputs({
  rules,
  cells,
  dayTypeId,
  bandId,
  disabled,
  emptyCellLabel,
  baseRateHint,
  onChange,
}: {
  rules: PayRules;
  cells: PayRateCells | undefined;
  dayTypeId: string;
  bandId: string;
  disabled?: boolean;
  emptyCellLabel: string;
  baseRateHint: number;
  onChange: (cells: PayRateCells) => void;
}) {
  const cell = readRateCell(cells, dayTypeId, bandId);
  const hasOverride = cellHasOverride(cell);
  const sourceMode: OverrideMode = hasOverride ? 'custom' : 'default';
  const valueMode = typeof cell.percent === 'number' ? 'percent' : 'rate';
  const value = valueMode === 'percent' ? cell.percent : cell.rate;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <select
        disabled={disabled}
        value={sourceMode}
        onChange={(event) => {
          const next = event.target.value as OverrideMode;
          if (next === 'default') {
            onChange(writeRateCell(cells, dayTypeId, bandId, null));
            return;
          }
          onChange(
            writeRateCell(
              cells,
              dayTypeId,
              bandId,
              resolveCustomSeed(rules, cells, dayTypeId, bandId, baseRateHint),
            ),
          );
        }}
        className={selectClass}
        aria-label="Cell override mode"
      >
        <option value="default">{emptyCellLabel}</option>
        <option value="custom">Edit</option>
      </select>

      {sourceMode === 'custom' ? (
        <div className="flex min-w-0 gap-1">
          <select
            disabled={disabled}
            value={valueMode}
            onChange={(event) => {
              const nextMode = event.target.value;
              if (value === undefined) {
                onChange(writeRateCell(cells, dayTypeId, bandId, null));
                return;
              }
              onChange(
                writeRateCell(
                  cells,
                  dayTypeId,
                  bandId,
                  nextMode === 'percent' ? { percent: value } : { rate: value },
                ),
              );
            }}
            className={selectClass}
          >
            <option value="rate">$</option>
            <option value="percent">%</option>
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            disabled={disabled}
            value={value ?? ''}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                onChange(writeRateCell(cells, dayTypeId, bandId, { rate: 0 }));
                return;
              }
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              onChange(
                writeRateCell(
                  cells,
                  dayTypeId,
                  bandId,
                  valueMode === 'percent' ? { percent: parsed } : { rate: parsed },
                ),
              );
            }}
            className={inputClass}
          />
        </div>
      ) : null}
    </div>
  );
}

export function RateMatrixEditor({
  rules,
  cells,
  onChange,
  disabled,
  emptyHint = 'Empty inherits company/base rate.',
  emptyCellLabel = 'Default',
  baseRateHint = 0,
}: RateMatrixEditorProps) {
  const rows = rateMatrixRows(rules);
  const resolvedBaseHint =
    baseRateHint > 0 ? baseRateHint : baseHourlyRateFromCells(cells, 0);

  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs text-subtle">{emptyHint}</p>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-border/70 bg-surface-base/30 p-3"
          >
            <p className="mb-3 text-sm font-semibold text-white">{row.name}</p>
            <div className="space-y-2.5">
              {rules.dayTypes.map((dayType) => (
                <label key={dayType.id} className="block">
                  <span className="mb-1 block text-[11px] text-subtle">{dayType.name}</span>
                  <RateCellInputs
                    rules={rules}
                    cells={cells}
                    dayTypeId={dayType.id}
                    bandId={row.id}
                    disabled={disabled}
                    emptyCellLabel={emptyCellLabel}
                    baseRateHint={resolvedBaseHint}
                    onChange={onChange}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-2 font-medium text-muted">Band</th>
              {rules.dayTypes.map((dayType) => (
                <th key={dayType.id} className="px-2 py-2 font-medium text-muted">
                  {dayType.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <td className="whitespace-nowrap px-2 py-2 text-foreground">{row.name}</td>
                {rules.dayTypes.map((dayType) => (
                  <td key={dayType.id} className="px-2 py-2 align-top">
                    <RateCellInputs
                      rules={rules}
                      cells={cells}
                      dayTypeId={dayType.id}
                      bandId={row.id}
                      disabled={disabled}
                      emptyCellLabel={emptyCellLabel}
                      baseRateHint={resolvedBaseHint}
                      onChange={onChange}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
