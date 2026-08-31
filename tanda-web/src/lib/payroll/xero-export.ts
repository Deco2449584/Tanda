import { csvCell, downloadCsv } from '@/lib/csv/download-csv';
import type { AwardReport, AwardSlice } from '@/lib/payroll/award-calc';
import { buildSiteChargePacks } from '@/lib/payroll/award-export';
import { DEFAULT_PAY_RULES } from '@/lib/payroll/default-pay-rules';
import type { PayRules, XeroExportSettings } from '@/lib/types/pay-rules';

function money(value: number): string {
  return value.toFixed(2);
}

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekInvoiceNumber(prefix: string, periodEnd: string, suffix?: string): string {
  const compact = periodEnd.replace(/-/g, '');
  const cleanPrefix = prefix.trim() || 'INV';
  return suffix ? `${cleanPrefix}-${compact}-${suffix}` : `${cleanPrefix}-${compact}`;
}

function applyTemplate(
  template: string,
  vars: { period: string; site?: string; staff?: string },
): string {
  return template
    .replaceAll('{period}', vars.period)
    .replaceAll('{site}', vars.site ?? '')
    .replaceAll('{staff}', vars.staff ?? '')
    .trim();
}

export function resolveXeroSettings(rules: PayRules): XeroExportSettings {
  const defaults = DEFAULT_PAY_RULES.xero!;
  const raw = rules.xero;
  if (!raw) return { ...defaults };
  return {
    salesAccountCode: raw.salesAccountCode.trim() || defaults.salesAccountCode,
    salesTaxType: raw.salesTaxType.trim() || defaults.salesTaxType,
    salesInvoicePrefix: raw.salesInvoicePrefix.trim() || defaults.salesInvoicePrefix,
    salesDescriptionTemplate:
      raw.salesDescriptionTemplate.trim() || defaults.salesDescriptionTemplate,
    billsTaxType: raw.billsTaxType.trim() || defaults.billsTaxType,
    billsInvoicePrefix: raw.billsInvoicePrefix.trim() || defaults.billsInvoicePrefix,
    billsDescriptionTemplate:
      raw.billsDescriptionTemplate.trim() || defaults.billsDescriptionTemplate,
    billsContactMode: raw.billsContactMode === 'shared' ? 'shared' : 'per_staff',
    billsSharedContactName:
      raw.billsSharedContactName.trim() || defaults.billsSharedContactName,
    billsFallbackAccountCode:
      raw.billsFallbackAccountCode.trim() || defaults.billsFallbackAccountCode,
    dueDays: Number.isFinite(raw.dueDays) && raw.dueDays >= 0 ? raw.dueDays : defaults.dueDays,
  };
}

function employmentTypeFor(
  rules: PayRules,
  employmentTypeId: string,
): PayRules['employmentTypes'][number] | undefined {
  return rules.employmentTypes.find((type) => type.id === employmentTypeId);
}

/**
 * Sales Invoice import: one line per site for the whole week's charge total.
 * Headers match Holly's SalesInvoiceTemplate.csv.
 * All business values come from rules.xero (Setup → Xero export).
 */
export function buildXeroSalesInvoiceCsv(input: {
  report: AwardReport;
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}): string[] {
  const xero = resolveXeroSettings(input.rules);
  const packs = buildSiteChargePacks({ report: input.report, rules: input.rules });
  const dueDate = addDaysIso(input.periodEnd, xero.dueDays);

  const lines: string[] = [
    [
      csvCell('*ContactName'),
      csvCell('*InvoiceNumber'),
      csvCell('Reference'),
      csvCell('*InvoiceDate'),
      csvCell('*DueDate'),
      csvCell('*Description'),
      csvCell('*Quantity'),
      csvCell('*UnitAmount'),
      csvCell('*AccountCode'),
      csvCell('*TaxType'),
    ].join(','),
  ];

  for (const pack of packs) {
    if (pack.amount <= 0) continue;
    const siteKey =
      pack.locationId === 'none' ? 'NOSITE' : pack.locationId.slice(0, 8).toUpperCase();
    lines.push(
      [
        csvCell(pack.locationName),
        csvCell(weekInvoiceNumber(xero.salesInvoicePrefix, input.periodEnd, siteKey)),
        csvCell(input.periodLabel),
        csvCell(input.periodEnd),
        csvCell(dueDate),
        csvCell(
          applyTemplate(xero.salesDescriptionTemplate, {
            period: input.periodLabel,
            site: pack.locationName,
          }),
        ),
        csvCell('1'),
        csvCell(money(pack.amount)),
        csvCell(xero.salesAccountCode),
        csvCell(xero.salesTaxType),
      ].join(','),
    );
  }

  return lines;
}

interface StaffPayBucket {
  employeeId: string;
  employeeName: string;
  employmentTypeId: string;
  payAmount: number;
}

/**
 * Bill import: one line per staff member for the week's pay total.
 * Headers match Holly's BillTemplate.csv.
 * ContactName / tax / prefixes come from rules.xero.
 */
export function buildXeroBillsCsv(input: {
  slices: AwardSlice[];
  rules: PayRules;
  periodLabel: string;
  periodEnd: string;
}): string[] {
  const xero = resolveXeroSettings(input.rules);
  const dueDate = addDaysIso(input.periodEnd, xero.dueDays);

  const byStaff = new Map<string, StaffPayBucket>();
  for (const slice of input.slices) {
    if (slice.payAmount <= 0) continue;
    const current = byStaff.get(slice.employeeId) ?? {
      employeeId: slice.employeeId,
      employeeName: slice.employeeName,
      employmentTypeId: slice.employmentTypeId,
      payAmount: 0,
    };
    current.payAmount = Math.round((current.payAmount + slice.payAmount) * 100) / 100;
    byStaff.set(slice.employeeId, current);
  }

  const lines: string[] = [
    [
      csvCell('*ContactName'),
      csvCell('*InvoiceNumber'),
      csvCell('*InvoiceDate'),
      csvCell('*DueDate'),
      csvCell('Description'),
      csvCell('*Quantity'),
      csvCell('*UnitAmount'),
      csvCell('*AccountCode'),
      csvCell('*TaxType'),
    ].join(','),
  ];

  const rows = [...byStaff.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );

  for (const row of rows) {
    const type = employmentTypeFor(input.rules, row.employmentTypeId);
    const accountCode =
      type?.expenseAccountCode?.trim() || xero.billsFallbackAccountCode;
    const contactName =
      xero.billsContactMode === 'shared'
        ? xero.billsSharedContactName
        : row.employeeName;
    lines.push(
      [
        csvCell(contactName),
        csvCell(weekInvoiceNumber(xero.billsInvoicePrefix, input.periodEnd, row.employeeId)),
        csvCell(input.periodEnd),
        csvCell(dueDate),
        csvCell(
          applyTemplate(xero.billsDescriptionTemplate, {
            period: input.periodLabel,
            staff: row.employeeName,
          }),
        ),
        csvCell('1'),
        csvCell(money(row.payAmount)),
        csvCell(accountCode),
        csvCell(xero.billsTaxType),
      ].join(','),
    );
  }

  return lines;
}

export function downloadXeroSalesInvoiceCsv(input: {
  report: AwardReport;
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}): void {
  downloadCsv(
    `xero-sales-invoice-${input.periodStart}_${input.periodEnd}.csv`,
    buildXeroSalesInvoiceCsv(input),
  );
}

export function downloadXeroBillsCsv(input: {
  slices: AwardSlice[];
  rules: PayRules;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}): void {
  downloadCsv(
    `xero-bills-${input.periodStart}_${input.periodEnd}.csv`,
    buildXeroBillsCsv(input),
  );
}
