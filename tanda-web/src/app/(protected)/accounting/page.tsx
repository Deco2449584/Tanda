'use client';

import { useState } from 'react';
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

type AccountingTab = 'rules' | 'rates' | 'reports';

const TABS: Array<{ id: AccountingTab; label: string }> = [
  { id: 'rules', label: 'Rules' },
  { id: 'rates', label: 'Rates' },
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
  const [tab, setTab] = useState<AccountingTab>('reports');
  const rules = settings.payRules ?? DEFAULT_PAY_RULES;

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="Accounting"
        description="Award rules, staff and site rates, and pay vs charge reports. Payroll uses the same engine."
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

      {tab === 'rules' ? (
        <AccountingRulesPanel
          rules={rules}
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
          onStaffSaved={refreshEmployees}
          onSiteSaved={refreshLocations}
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
        />
      ) : null}
    </PageContent>
  );
}
