'use client';

import { useState } from 'react';
import { AccountingClosePanel } from '@/components/accounting/AccountingClosePanel';
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

type AccountingTab = 'close' | 'rules' | 'rates' | 'reports';

const TABS: Array<{ id: AccountingTab; label: string }> = [
  { id: 'close', label: 'Close' },
  { id: 'rates', label: 'Rates' },
  { id: 'rules', label: 'Rules' },
  { id: 'reports', label: 'Reports' },
];

export default function AccountingPage() {
  const { canPerformAction } = useAdminAccess();
  const canEditRules = canPerformAction('accounting', 'updateRules');
  const canEditRates = canPerformAction('accounting', 'updateRates');
  const canExport = canPerformAction('accounting', 'export');
  const { settings, refresh: refreshSettings } = useCompanySettings();
  const { employees, refresh: refreshEmployees } = useEmployees();
  const { locations, refresh: refreshLocations } = useLocations();
  const [tab, setTab] = useState<AccountingTab>('close');
  const rules = settings.payRules ?? DEFAULT_PAY_RULES;

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="Accounting"
        description="Close the week, check exceptions, then export journal and charge packs. Payroll uses the same figures."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              tab === item.id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border bg-surface-raised text-muted hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'close' ? (
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

      {tab === 'rules' ? (
        <AccountingRulesPanel
          rules={rules}
          locations={locations}
          canEdit={canEditRules}
          onSaved={() => refreshSettings()}
        />
      ) : null}

      {tab === 'rates' ? (
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
      ) : null}

      {tab === 'reports' ? (
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
