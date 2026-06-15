import { COMPANY_NAME } from '@/lib/types/company-settings';

/** Continental Cargo logo navy — matches public/logo.svg */
export const PORTAL_NAVY = '#001A3F';
export const PORTAL_NAVY_LIGHT = '#0A2D5C';
export const PORTAL_ACCENT = '#1A5FA8';

export const PORTAL_COMPANY_TAGLINE = 'Logistics Company';

export const PORTAL_CONTACT = {
  email: 'operations@continentalcargo.com.au',
  phone: '+61 2 9000 1200',
  location: 'Sydney, Australia',
} as const;

export const PORTAL_HIGHLIGHTS = [
  {
    title: 'Live inspection status',
    description:
      'Track perishable cargo from warehouse intake through ULD loading.',
  },
  {
    title: 'Photo & video evidence',
    description:
      'Review inspection media and export reports shared with your team.',
  },
  {
    title: 'Secure forwarder access',
    description:
      'AWB and company PIN keep your shipment data private to your account.',
  },
] as const;

export const PORTAL_TRUST_STATS = [
  { label: 'Hub location', value: 'Sydney' },
  { label: 'Specialisation', value: 'Perishables' },
  { label: 'Support', value: '24/7 ops desk' },
] as const;

export function portalCopyright(): string {
  return `© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.`;
}
