'use client';

import { useState } from 'react';
import { AccountingClosePanel } from '@/components/accounting/AccountingClosePanel';
import { AccountingOverviewPanel } from '@/components/accounting/AccountingOverviewPanel';
import { AccountingRatesPanel } from '@/components/accounting/AccountingRatesPanel';
import { AccountingReportsPanel } from '@/components/accounting/AccountingReportsPanel';
import { AccountingRulesPanel } from '@/components/accounting/AccountingRulesPanel';
import { PageContent } from '@/components/ui/PageContent';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { DEFAULT_PAY_RULES } from '@/lib/payroll/default-pay-rules';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';

type AccountingTab = 'overview' | 'setup' | 'weekly-close' | 'exports';

const TABS: Array<{ id: AccountingTab; label: string; hint: string }> = [
  { id: 'overview', label: 'Overview', hint: 'Status and next steps' },
  { id: 'setup', label: 'Setup', hint: 'Rules and rate cards' },
  { id: 'weekly-close', label: 'Weekly close', hint: 'Review and freeze' },
  { id: 'exports', label: 'Exports', hint: 'Download files' },
];

export default function AccountingPage() {
  const { canPerformAction } = useAdminAccess();
  const canEditRules = canPerformAction('accounting', 'updateRules');
  const canEditRates = canPerformAction('accounting', 'updateRates');
  const canExport = canPerformAction('accounting', 'export');
  const { settings, refresh: refreshSettings } = useCompanySettings();
  const { employees, refresh: refreshEmployees } = useEmployees();
  const { locations, refresh: refreshLocations } = useLocations();
  const [tab, setTab] = useState<AccountingTab>('overview');
  const rules = settings.payRules ?? DEFAULT_PAY_RULES;

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Accounting</h1>
        <p className="mt-1 text-sm text-muted">
          Configure pay and charge rules, review the week, then export files for your systems.
        </p>
      </div>

      <nav className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-raised p-1 md:flex md:flex-wrap">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex min-w-0 flex-col rounded-lg px-3 py-2.5 text-left transition md:px-4 ${
              tab === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="hidden text-[11px] opacity-70 sm:block">{item.hint}</span>
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <AccountingOverviewPanel
          rules={rules}
          timeZone={settings.timeZone}
          currency={settings.currency}
          attendanceBreak={settings.attendanceBreak}
          employees={employees}
          locations={locations}
          onNavigate={setTab}
        />
      ) : null}

      {tab === 'setup' ? (
        <div className="min-w-0 space-y-8">
          <section>
            <SectionHeader
              title="Pay and charge rules"
              description="Define time bands, day types, overtime thresholds, minimums, allowances, and employment types. These apply company-wide unless overridden per staff or site."
            />
            <AccountingRulesPanel
              rules={rules}
              locations={locations}
              canEdit={canEditRules}
              onSaved={() => refreshSettings()}
            />
          </section>
          <section>
            <SectionHeader
              title="Rate cards"
              description="Set company default loadings, then override per staff member (pay) or per site (charge). Staff without a card use the company defaults."
            />
            <AccountingRatesPanel
              rules={rules}
              employees={employees}
              locations={locations}
              canEdit={canEditRates}
              canEditRules={canEditRules}
              onStaffSaved={refreshEmployees}
              onSiteSaved={refreshLocations}
              onRulesSaved={refreshSettings}
            />
          </section>
        </div>
      ) : null}

      {tab === 'weekly-close' ? (
        <AccountingClosePanel
          rules={rules}
          timeZone={settings.timeZone}
          currency={settings.currency}
          attendanceBreak={settings.attendanceBreak}
          employees={employees}
          locations={locations}
          canExport={canExport}
          canLock={canExport || canEditRules}
          canUnlock={canEditRules}
        />
      ) : null}

      {tab === 'exports' ? (
        <AccountingReportsPanel
          rules={rules}
          timeZone={settings.timeZone}
          currency={settings.currency}
          attendanceBreak={settings.attendanceBreak}
          employees={employees}
          locations={locations}
          canExport={canExport}
          canEditRules={canEditRules}
          onPresetsSaved={refreshSettings}
        />
      ) : null}
    </PageContent>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
