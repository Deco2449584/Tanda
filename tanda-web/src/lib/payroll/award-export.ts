import { csvCell, downloadCsv } from '@/lib/csv/download-csv';
import type { AwardReport, AwardSlice } from '@/lib/payroll/award-calc';
import { groupAwardSlices } from '@/lib/payroll/award-calc';
import type { PayRules } from '@/lib/types/pay-rules';

export type AccountingReportView =
  | 'pay'
  | 'charge'
  | 'margin'
  | 'timesheet'
  | 'journal';

export type AccountingGroupBy = 'staff' | 'site' | 'date' | 'band' | 'employmentType';

function money(value: number): string {
  return value.toFixed(2);
}

function headerRow(label: string, value: string | number): string {
  return `${csvCell(label)},${csvCell(value)}`;
}

function bandLabel(rules: PayRules, bandId: string): string {
  if (bandId === 'base') return 'Base';
  if (bandId === 'overtime') return 'Overtime';
  return rules.timeBands.find((band) => band.id === bandId)?.name ?? bandId;
}

function dayLabel(rules: PayRules, dayTypeId: string): string {
  return rules.dayTypes.find((type) => type.id === dayTypeId)?.name ?? dayTypeId;
}

function employmentLabel(rules: PayRules, employmentTypeId: string): string {
  return (
    rules.employmentTypes.find((type) => type.id === employmentTypeId)?.label ??
    employmentTypeId
  );
}

export function buildAccountingGroupedCsv(input: {
  view: Exclude<AccountingReportView, 'timesheet' | 'journal'>;
  groupBy: AccountingGroupBy;
  slices: AwardSlice[];
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}): string[] {
  const grouped = groupAwardSlices(input.slices, input.groupBy).map((row) => ({
    ...row,
    label:
      input.groupBy === 'employmentType'
        ? employmentLabel(input.rules, row.key)
        : input.groupBy === 'band'
          ? `${dayLabel(input.rules, row.key.split(':')[0] ?? '')} / ${bandLabel(input.rules, row.key.split(':')[1] ?? '')}`
          : row.label,
  }));

  const amountKey =
    input.view === 'pay' ? 'payAmount' : input.view === 'charge' ? 'chargeAmount' : 'margin';
  const hoursKey = input.view === 'charge' ? 'chargeHours' : 'payHours';

  const lines: string[] = [
    headerRow('Report', `Accounting ${input.view}`),
    headerRow('Pay period', input.periodLabel),
    headerRow('Period start', input.periodStart),
    headerRow('Period end', input.periodEnd),
    headerRow('Generated at', input.generatedAt),
    '',
    [csvCell('Group'), csvCell('Hours'), csvCell('Amount')].join(','),
  ];

  for (const row of grouped) {
    lines.push(
      [csvCell(row.label), csvCell(row[hoursKey].toFixed(2)), csvCell(money(row[amountKey]))].join(
        ',',
      ),
    );
  }

  return lines;
}

export function buildAccountingTimesheetCsv(input: {
  slices: AwardSlice[];
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}): string[] {
  const lines: string[] = [
    headerRow('Report', 'Accounting timesheet'),
    headerRow('Pay period', input.periodLabel),
    headerRow('Period start', input.periodStart),
    headerRow('Period end', input.periodEnd),
    headerRow('Generated at', input.generatedAt),
    '',
    [
      csvCell('Date'),
      csvCell('Employee ID'),
      csvCell('Employee'),
      csvCell('Site'),
      csvCell('Day type'),
      csvCell('Band'),
      csvCell('Pay hours'),
      csvCell('Charge hours'),
      csvCell('Pay rate'),
      csvCell('Charge rate'),
      csvCell('Pay amount'),
      csvCell('Charge amount'),
      csvCell('Margin'),
    ].join(','),
  ];

  for (const slice of input.slices) {
    lines.push(
      [
        csvCell(slice.date),
        csvCell(slice.employeeId),
        csvCell(slice.employeeName),
        csvCell(slice.locationName),
        csvCell(dayLabel(input.rules, slice.dayTypeId)),
        csvCell(bandLabel(input.rules, slice.bandId)),
        csvCell(slice.payHours.toFixed(2)),
        csvCell(slice.chargeHours.toFixed(2)),
        csvCell(money(slice.payRate)),
        csvCell(money(slice.chargeRate)),
        csvCell(money(slice.payAmount)),
        csvCell(money(slice.chargeAmount)),
        csvCell(money(slice.chargeAmount - slice.payAmount)),
      ].join(','),
    );
  }

  return lines;
}

export function buildAccountingJournalLines(input: {
  report: AwardReport;
  rules: PayRules;
  periodLabel: string;
  periodEnd: string;
  generatedAt: string;
  companyName: string;
}): string[] {
  const byType = new Map<
    string,
    { payAmount: number; locations: Map<string, number> }
  >();

  for (const slice of input.report.slices) {
    const current = byType.get(slice.employmentTypeId) ?? {
      payAmount: 0,
      locations: new Map<string, number>(),
    };
    current.payAmount = Math.round((current.payAmount + slice.payAmount) * 100) / 100;
    const loc = slice.locationName || 'Unassigned';
    current.locations.set(loc, Math.round(((current.locations.get(loc) ?? 0) + slice.payAmount) * 100) / 100);
    byType.set(slice.employmentTypeId, current);
  }

  const description = `Weekly payroll - ${input.periodLabel}`;
  const lines: string[] = [
    headerRow('Report', 'Payroll journal'),
    headerRow('Company', input.companyName),
    headerRow('Pay period', input.periodLabel),
    headerRow('Journal date', input.periodEnd),
    headerRow('Generated at', input.generatedAt),
    '',
    [
      csvCell('Date'),
      csvCell('Account code'),
      csvCell('Account name'),
      csvCell('Description'),
      csvCell('Debit'),
      csvCell('Credit'),
      csvCell('Tracking'),
    ].join(','),
  ];

  let debitTotal = 0;
  let creditTotal = 0;

  for (const type of input.rules.employmentTypes) {
    const bucket = byType.get(type.id);
    if (!bucket || bucket.payAmount <= 0) continue;

    for (const [location, amount] of bucket.locations) {
      if (amount <= 0) continue;
      lines.push(
        [
          csvCell(input.periodEnd),
          csvCell(type.expenseAccountCode ?? ''),
          csvCell(type.expenseAccountName ?? ''),
          csvCell(description),
          csvCell(money(amount)),
          csvCell(''),
          csvCell(location),
        ].join(','),
      );
      debitTotal += amount;
    }

    lines.push(
      [
        csvCell(input.periodEnd),
        csvCell(type.payableAccountCode ?? ''),
        csvCell(type.payableAccountName ?? ''),
        csvCell(description),
        csvCell(''),
        csvCell(money(bucket.payAmount)),
        csvCell(''),
      ].join(','),
    );
    creditTotal += bucket.payAmount;
  }

  lines.push('');
  lines.push(
    [
      csvCell('TOTALS'),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(money(Math.round(debitTotal * 100) / 100)),
      csvCell(money(Math.round(creditTotal * 100) / 100)),
      csvCell(''),
    ].join(','),
  );

  return lines;
}

export function exportAccountingViewToCsv(input: {
  view: AccountingReportView;
  groupBy: AccountingGroupBy;
  report: AwardReport;
  slices: AwardSlice[];
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  companyName: string;
}): void {
  const generatedAt = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const filename = `accounting-${input.view}-${input.periodStart}_${input.periodEnd}.csv`;

  if (input.view === 'timesheet') {
    downloadCsv(
      filename,
      buildAccountingTimesheetCsv({
        slices: input.slices,
        rules: input.rules,
        periodLabel: input.periodLabel,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        generatedAt,
      }),
    );
    return;
  }

  if (input.view === 'journal') {
    downloadCsv(
      filename,
      buildAccountingJournalLines({
        report: input.report,
        rules: input.rules,
        periodLabel: input.periodLabel,
        periodEnd: input.periodEnd,
        generatedAt,
        companyName: input.companyName,
      }),
    );
    return;
  }

  downloadCsv(
    filename,
    buildAccountingGroupedCsv({
      view: input.view,
      groupBy: input.groupBy,
      slices: input.slices,
      rules: input.rules,
      periodLabel: input.periodLabel,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      generatedAt,
    }),
  );
}
