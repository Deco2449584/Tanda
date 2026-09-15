'use client';

import { useState } from 'react';
import { AccountingClosePanel } from '@/components/accounting/AccountingClosePanel';
import { AccountingOverviewPanel } from '@/components/accounting/AccountingOverviewPanel';
import { AccountingRatesPanel } from '@/components/accounting/AccountingRatesPanel';
import { AccountingReportsPanel } from '@/components/accounting/AccountingReportsPanel';
import { AccountingRulesPanel } from '@/components/accounting/AccountingRulesPanel';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { DEFAULT_PAY_RULES } from '@/lib/payroll/default-pay-rules';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { Calculator } from 'lucide-react';

type AccountingTab = 'overview' | 'pay-rules' | 'rate-cards' | 'weekly-close' | 'exports';

const FLOW_TABS: Array<{ id: AccountingTab; label: string; hint: string }> = [
  { id: 'overview', label: 'Overview', hint: 'Status and next steps' },
  { id: 'weekly-close', label: 'Weekly close', hint: 'Review and freeze' },
  { id: 'exports', label: 'Exports', hint: 'Download files' },
];

const SETTINGS_TABS: Array<{ id: AccountingTab; label: string; hint: string }> = [
  { id: 'pay-rules', label: 'Pay & charge rules', hint: 'Bands, OT, minimums' },
  { id: 'rate-cards', label: 'Rate cards', hint: 'Staff, clients, defaults' },
];

function TabButton({
  item,
  active,
  onSelect,
}: {
  item: { id: AccountingTab; label: string; hint: string };
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex shrink-0 flex-col rounded-lg border px-3 py-2.5 text-left transition md:min-w-0 md:px-4 ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary'
          : 'border-border/70 text-muted hover:border-border hover:bg-surface-hover hover:text-foreground'
      }`}
    >
      <span className="text-sm font-semibold whitespace-nowrap">{item.label}</span>
      <span className="hidden text-[11px] opacity-70 sm:block">{item.hint}</span>
    </button>
  );
}

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
  const settingsActive = tab === 'pay-rules' || tab === 'rate-cards';

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Finance"
        eyebrowIcon={Calculator}
        title="Accounting"
        description="Configure pay and charge rules, review the week, then export files for your systems."
      />

      <nav className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-surface-raised p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:overflow-visible">
        <TabButton
          item={FLOW_TABS[0]}
          active={tab === 'overview'}
          onSelect={() => setTab('overview')}
        />

        <div
          className={`flex shrink-0 flex-col gap-1 rounded-xl border px-1.5 pb-1.5 pt-1 ${
            settingsActive
              ? 'border-primary/35 bg-primary/5'
              : 'border-border/80 bg-surface-base/40'
          }`}
        >
          <p
            className={`px-2 pt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              settingsActive ? 'text-primary/90' : 'text-subtle'
            }`}
          >
            Settings
          </p>
          <div className="flex gap-1">
            {SETTINGS_TABS.map((item) => (
              <TabButton
                key={item.id}
                item={item}
                active={tab === item.id}
                onSelect={() => setTab(item.id)}
              />
            ))}
          </div>
        </div>

        <TabButton
          item={FLOW_TABS[1]}
          active={tab === 'weekly-close'}
          onSelect={() => setTab('weekly-close')}
        />
        <TabButton
          item={FLOW_TABS[2]}
          active={tab === 'exports'}
          onSelect={() => setTab('exports')}
        />
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

      {tab === 'pay-rules' ? (
        <div className="min-w-0">
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
        </div>
      ) : null}

      {tab === 'rate-cards' ? (
        <div className="min-w-0">
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
