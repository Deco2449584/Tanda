'use client';

import { rateMatrixRows, readRateCell, writeRateCell } from '@/lib/payroll/rate-matrix';
import type { PayRateCells, PayRules } from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-2 py-1.5 text-sm text-white outline-none focus:border-primary';

interface RateMatrixEditorProps {
  rules: PayRules;
  cells: PayRateCells | undefined;
  onChange: (cells: PayRateCells) => void;
  disabled?: boolean;
  emptyHint?: string;
}

export function RateMatrixEditor({
  rules,
  cells,
  onChange,
  disabled,
  emptyHint = 'Empty inherits company/base rate.',
}: RateMatrixEditorProps) {
  const rows = rateMatrixRows(rules);

  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-subtle">{emptyHint}</p>
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
              <td className="px-2 py-2 text-foreground">{row.name}</td>
              {rules.dayTypes.map((dayType) => {
                const cell = readRateCell(cells, dayType.id, row.id);
                const mode = typeof cell.percent === 'number' ? 'percent' : 'rate';
                const value = mode === 'percent' ? cell.percent : cell.rate;
                return (
                  <td key={dayType.id} className="px-2 py-2">
                    <div className="flex gap-1">
                      <select
                        disabled={disabled}
                        value={mode}
                        onChange={(event) => {
                          const nextMode = event.target.value;
                          if (value === undefined) {
                            onChange(writeRateCell(cells, dayType.id, row.id, null));
                            return;
                          }
                          onChange(
                            writeRateCell(
                              cells,
                              dayType.id,
                              row.id,
                              nextMode === 'percent' ? { percent: value } : { rate: value },
                            ),
                          );
                        }}
                        className="rounded-lg border border-border-strong bg-surface-base px-1.5 text-xs text-muted"
                      >
                        <option value="rate">$</option>
                        <option value="percent">%</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={disabled}
                        value={value ?? ''}
                        placeholder="—"
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === '') {
                            onChange(writeRateCell(cells, dayType.id, row.id, null));
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          onChange(
                            writeRateCell(
                              cells,
                              dayType.id,
                              row.id,
                              mode === 'percent' ? { percent: parsed } : { rate: parsed },
                            ),
                          );
                        }}
                        className={inputClass}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
