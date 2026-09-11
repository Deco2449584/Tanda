import { COMPANY_NAME } from '@/lib/types/company-settings';

/** Copy shared with the Continental Inspect mobile app. */
export const INSPECT_BRAND = {
  company: COMPANY_NAME,
  appName: 'Continental Inspect',
  panelTitle: 'Sydney Airport Export Terminal',
  operations: 'Warehouse Operations',
  license:
    "Customs & Export Division License No. CED449584. Apt 2, 77 O'Riordan St, Alexandria NSW 2015, Australia",
  supportUrl: 'https://support.continentalcargo.com',
  supportUrlDisplay: 'support.continentalcargo.com',
  phone: '1-800-Cargo-5',
  /** Dialable digits for `tel:` links (1-800-CARGO-5). */
  phoneDial: '1800227465',
} as const;
