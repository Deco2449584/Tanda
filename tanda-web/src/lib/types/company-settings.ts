export const COMPANY_NAME = 'Continental Cargo';

export interface CompanySettings {
  timeZone: string;
  currency: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
};
