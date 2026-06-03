export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  timeZone: string;
  currency: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Continental Cargo',
  logoUrl: '',
  primaryColor: '#2563eb',
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
};
