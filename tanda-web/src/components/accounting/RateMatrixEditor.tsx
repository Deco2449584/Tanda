'use client';

import { rateMatrixRows, readRateCell, writeRateCell } from '@/lib/payroll/rate-matrix';
import type { PayRateCells, PayRules } from '@/lib/types/pay-rules';

const inputClass =
  'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-2 py-1.5 text-sm text-white outline-none focus:border-primary';

interface RateMatrixEditorProps {
  rules: PayRules;
  cells: PayRateCells | undefined;
  onChange: (cells: PayRateCells) => void;
  disabled?: boolean;
  emptyHint?: string;
  emptyCellLabel?: string;
}

function RateCellInputs({
  cells,
  dayTypeId,
  bandId,
  disabled,
  emptyCellLabel,
  onChange,
}: {
  cells: PayRateCells | undefined;
  dayTypeId: string;
  bandId: string;
  disabled?: boolean;
  emptyCellLabel: string;
  onChange: (cells: PayRateCells) => void;
}) {
  const cell = readRateCell(cells, dayTypeId, bandId);
  const mode = typeof cell.percent === 'number' ? 'percent' : 'rate';
  const value = mode === 'percent' ? cell.percent : cell.rate;

  return (
    <div className="flex min-w-0 gap-1">
      <select
        disabled={disabled}
        value={mode}
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
        className="shrink-0 rounded-lg border border-border-strong bg-surface-base px-1.5 text-xs text-muted"
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
        placeholder={emptyCellLabel}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === '') {
            onChange(writeRateCell(cells, dayTypeId, bandId, null));
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onChange(
            writeRateCell(
              cells,
              dayTypeId,
              bandId,
              mode === 'percent' ? { percent: parsed } : { rate: parsed },
            ),
          );
        }}
        className={inputClass}
      />
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
}: RateMatrixEditorProps) {
  const rows = rateMatrixRows(rules);

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
                    cells={cells}
                    dayTypeId={dayType.id}
                    bandId={row.id}
                    disabled={disabled}
                    emptyCellLabel={emptyCellLabel}
                    onChange={onChange}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
                  <td key={dayType.id} className="px-2 py-2">
                    <RateCellInputs
                      cells={cells}
                      dayTypeId={dayType.id}
                      bandId={row.id}
                      disabled={disabled}
                      emptyCellLabel={emptyCellLabel}
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
