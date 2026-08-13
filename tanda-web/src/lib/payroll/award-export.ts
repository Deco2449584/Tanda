import { csvCell, downloadCsv } from '@/lib/csv/download-csv';
import type { AwardReport, AwardSlice } from '@/lib/payroll/award-calc';
import { bandDisplayName, dayTypeDisplayName, groupAwardSlices } from '@/lib/payroll/award-calc';
import type { PayRules } from '@/lib/types/pay-rules';

export type AccountingReportView =
  | 'pay'
  | 'charge'
  | 'margin'
  | 'timesheet'
  | 'journal'
  | 'chargePack';

export interface AccountingJournalRow {
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  tracking: string;
  memo: string;
}

export interface SiteChargePackBand {
  dayTypeId: string;
  dayTypeName: string;
  bandId: string;
  bandName: string;
  hours: number;
  amount: number;
}

export interface SiteChargePack {
  locationId: string;
  locationName: string;
  hours: number;
  amount: number;
  minHoursApplied: number;
  bands: SiteChargePackBand[];
}

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

export function buildAccountingJournalRows(input: {
  report: AwardReport;
  rules: PayRules;
  periodLabel: string;
  periodEnd: string;
}): AccountingJournalRow[] {
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
  const rows: AccountingJournalRow[] = [];

  for (const type of input.rules.employmentTypes) {
    const bucket = byType.get(type.id);
    if (!bucket || bucket.payAmount <= 0) continue;
    const superMemo =
      typeof type.superPercent === 'number' && type.superPercent > 0
        ? `Super ${type.superPercent}% of ${money(bucket.payAmount)} (memo only — not posted)`
        : '';

    for (const [location, amount] of bucket.locations) {
      if (amount <= 0) continue;
      rows.push({
        date: input.periodEnd,
        accountCode: type.expenseAccountCode ?? '',
        accountName: type.expenseAccountName ?? '',
        description,
        debit: amount,
        credit: 0,
        tracking: location,
        memo: superMemo,
      });
    }

    rows.push({
      date: input.periodEnd,
      accountCode: type.payableAccountCode ?? '',
      accountName: type.payableAccountName ?? '',
      description,
      debit: 0,
      credit: bucket.payAmount,
      tracking: '',
      memo: superMemo,
    });
  }

  return rows;
}

export function buildAccountingJournalLines(input: {
  report: AwardReport;
  rules: PayRules;
  periodLabel: string;
  periodEnd: string;
  generatedAt: string;
  companyName: string;
}): string[] {
  const rows = buildAccountingJournalRows(input);
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
      csvCell('Memo'),
    ].join(','),
  ];

  let debitTotal = 0;
  let creditTotal = 0;

  for (const row of rows) {
    lines.push(
      [
        csvCell(row.date),
        csvCell(row.accountCode),
        csvCell(row.accountName),
        csvCell(row.description),
        csvCell(row.debit > 0 ? money(row.debit) : ''),
        csvCell(row.credit > 0 ? money(row.credit) : ''),
        csvCell(row.tracking),
        csvCell(row.memo),
      ].join(','),
    );
    debitTotal += row.debit;
    creditTotal += row.credit;
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
      csvCell(''),
    ].join(','),
  );

  return lines;
}

export function buildSiteChargePacks(input: {
  report: AwardReport;
  rules: PayRules;
}): SiteChargePack[] {
  const packs = new Map<string, SiteChargePack>();

  for (const slice of input.report.slices) {
    const locationId = slice.locationId || 'none';
    const pack = packs.get(locationId) ?? {
      locationId,
      locationName: slice.locationName || 'No site',
      hours: 0,
      amount: 0,
      minHoursApplied: 0,
      bands: [],
    };
    const bandKey = `${slice.dayTypeId}:${slice.bandId}`;
    let band = pack.bands.find((item) => `${item.dayTypeId}:${item.bandId}` === bandKey);
    if (!band) {
      band = {
        dayTypeId: slice.dayTypeId,
        dayTypeName: dayTypeDisplayName(input.rules, slice.dayTypeId),
        bandId: slice.bandId,
        bandName: bandDisplayName(input.rules, slice.bandId),
        hours: 0,
        amount: 0,
      };
      pack.bands.push(band);
    }
    band.hours = Math.round((band.hours + slice.chargeHours) * 100) / 100;
    band.amount = Math.round((band.amount + slice.chargeAmount) * 100) / 100;
    pack.hours = Math.round((pack.hours + slice.chargeHours) * 100) / 100;
    pack.amount = Math.round((pack.amount + slice.chargeAmount) * 100) / 100;
    packs.set(locationId, pack);
  }

  for (const line of input.report.sessions) {
    if (!line.minChargeApplied) continue;
    const extra = Math.max(0, line.chargeHours - line.billableHours);
    const pack = packs.get(line.locationId || 'none');
    if (pack) {
      pack.minHoursApplied = Math.round((pack.minHoursApplied + extra) * 100) / 100;
    }
  }

  return [...packs.values()].sort((a, b) => a.locationName.localeCompare(b.locationName));
}

export function buildSiteChargePackCsv(input: {
  packs: SiteChargePack[];
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}): string[] {
  const lines: string[] = [
    headerRow('Report', 'Charge pack by site'),
    headerRow('Pay period', input.periodLabel),
    headerRow('Period start', input.periodStart),
    headerRow('Period end', input.periodEnd),
    headerRow('Generated at', input.generatedAt),
  ];

  for (const pack of input.packs) {
    lines.push('');
    lines.push(headerRow('Site', pack.locationName));
    lines.push(headerRow('Min hours applied', pack.minHoursApplied.toFixed(2)));
    lines.push(
      [csvCell('Day type'), csvCell('Band'), csvCell('Hours'), csvCell('Amount')].join(','),
    );
    for (const band of pack.bands) {
      lines.push(
        [
          csvCell(band.dayTypeName),
          csvCell(band.bandName),
          csvCell(band.hours.toFixed(2)),
          csvCell(money(band.amount)),
        ].join(','),
      );
    }
    lines.push(
      [
        csvCell('SITE TOTAL'),
        csvCell(''),
        csvCell(pack.hours.toFixed(2)),
        csvCell(money(pack.amount)),
      ].join(','),
    );
  }

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

  if (input.view === 'chargePack') {
    downloadCsv(
      filename,
      buildSiteChargePackCsv({
        packs: buildSiteChargePacks({ report: input.report, rules: input.rules }),
        periodLabel: input.periodLabel,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        generatedAt,
      }),
    );
    return;
  }

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
