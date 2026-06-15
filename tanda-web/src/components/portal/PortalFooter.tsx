import { Mail, MapPin, Phone } from 'lucide-react';
import {
  PORTAL_CONTACT,
  portalCopyright,
} from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export function PortalFooter() {
  return (
    <footer className="mt-auto border-t border-[#001A3F]/10 bg-[#001A3F] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-wide">{COMPANY_NAME}</p>
            <p className="mt-1 text-sm text-white/70">
              Perishables logistics and air cargo handling for forwarders and
              exporters.
            </p>
          </div>

          <div className="space-y-2 text-sm text-white/80">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              {PORTAL_CONTACT.location}
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              {PORTAL_CONTACT.phone}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
              {PORTAL_CONTACT.email}
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-white/10 pt-6 text-xs text-white/50">
          {portalCopyright()}
        </p>
      </div>
    </footer>
  );
}
