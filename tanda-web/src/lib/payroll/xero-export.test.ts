import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AwardReport, AwardSlice } from './award-calc';
import { DEFAULT_PAY_RULES } from './default-pay-rules';
import { buildXeroBillsCsv, buildXeroSalesInvoiceCsv } from './xero-export';
import type { PayRules } from '@/lib/types/pay-rules';

function slice(overrides: Partial<AwardSlice> = {}): AwardSlice {
  return {
    employeeDocId: 'doc1',
    employeeId: 'E1',
    employeeName: 'Alex Worker',
    department: 'Warehouse',
    employmentTypeId: 'full_time',
    locationId: 'loc1',
    locationName: 'Sydney WH',
    date: '2026-03-02',
    sessionKey: 's1',
    dayTypeId: 'weekday',
    bandId: 'base',
    overtime: false,
    hours: 8,
    payHours: 8,
    chargeHours: 8,
    payRate: 30,
    chargeRate: 45,
    payAmount: 240,
    chargeAmount: 360,
    ...overrides,
  };
}

test('Xero sales invoice is one aggregated line per site', () => {
  const report: AwardReport = {
    slices: [
      slice({ chargeAmount: 100, payAmount: 50 }),
      slice({ chargeAmount: 50, payAmount: 25, bandId: 'afternoon' }),
      slice({
        locationId: 'loc2',
        locationName: 'Melbourne WH',
        chargeAmount: 80,
        payAmount: 40,
      }),
    ],
    sessions: [],
    incompleteSessions: 0,
    incomplete: [],
    totals: { payHours: 0, chargeHours: 0, payAmount: 0, chargeAmount: 0, margin: 0 },
  };

  const lines = buildXeroSalesInvoiceCsv({
    report,
    rules: DEFAULT_PAY_RULES,
    periodLabel: '2–8 Mar 2026',
    periodStart: '2026-03-02',
    periodEnd: '2026-03-08',
  });

  assert.equal(lines.length, 3); // header + 2 sites
  assert.match(lines[0]!, /\*ContactName/);
  const body = lines.slice(1).join('\n');
  assert.match(body, /Sydney WH/);
  assert.match(body, /"1","150\.00"/);
  assert.match(body, /Melbourne WH/);
  assert.match(body, /"1","80\.00"/);
});

test('Xero bills are one aggregated line per staff member', () => {
  const lines = buildXeroBillsCsv({
    slices: [
      slice({ payAmount: 100 }),
      slice({ payAmount: 50, bandId: 'afternoon' }),
      slice({
        employeeId: 'E2',
        employeeName: 'Sam Contractor',
        employmentTypeId: 'contractor',
        payAmount: 200,
      }),
    ],
    rules: DEFAULT_PAY_RULES,
    periodLabel: '2–8 Mar 2026',
    periodEnd: '2026-03-08',
  });

  assert.equal(lines.length, 3); // header + 2 staff
  assert.match(lines[0]!, /\*ContactName/);
  const body = lines.slice(1).join('\n');
  assert.match(body, /Alex Worker/);
  assert.match(body, /"1","150\.00","6100"/);
  assert.match(body, /Sam Contractor/);
  assert.match(body, /"1","200\.00","6200"/);
});

test('Xero exports read configurable settings from pay rules', () => {
  const rules: PayRules = {
    ...DEFAULT_PAY_RULES,
    xero: {
      ...DEFAULT_PAY_RULES.xero!,
      salesAccountCode: '400',
      salesTaxType: 'GST Free Income',
      salesInvoicePrefix: 'INV',
      salesDescriptionTemplate: 'Charge {site} ({period})',
      billsTaxType: 'BAS Excluded',
      billsInvoicePrefix: 'PAY',
      billsDescriptionTemplate: 'Pay {staff}',
      billsContactMode: 'shared',
      billsSharedContactName: 'Wage Clearing',
      dueDays: 7,
    },
  };

  const sales = buildXeroSalesInvoiceCsv({
    report: {
      slices: [slice({ chargeAmount: 99 })],
      sessions: [],
      incompleteSessions: 0,
      incomplete: [],
      totals: { payHours: 0, chargeHours: 0, payAmount: 0, chargeAmount: 0, margin: 0 },
    },
    rules,
    periodLabel: 'Week A',
    periodStart: '2026-03-02',
    periodEnd: '2026-03-08',
  });
  assert.match(sales[1]!, /"400"/);
  assert.match(sales[1]!, /GST Free Income/);
  assert.match(sales[1]!, /INV-20260308/);
  assert.match(sales[1]!, /Charge Sydney WH \(Week A\)/);
  assert.match(sales[1]!, /2026-03-15/); // +7 days

  const bills = buildXeroBillsCsv({
    slices: [slice({ payAmount: 50 })],
    rules,
    periodLabel: 'Week A',
    periodEnd: '2026-03-08',
  });
  assert.match(bills[1]!, /Wage Clearing/);
  assert.match(bills[1]!, /BAS Excluded/);
  assert.match(bills[1]!, /PAY-20260308-E1/);
  assert.match(bills[1]!, /Pay Alex Worker/);
});
