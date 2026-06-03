export interface CompanySettings {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  timeZone: string;
  currency: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Continental Cargo',
  logoUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#3b82f6',
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
};
