import { Mail, MapPin, Phone } from 'lucide-react';
import {
  PORTAL_CONTACT,
  portalCopyright,
} from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export function PortalFooter() {
  return (
    <footer className="border-t border-[#F51EA0] bg-[#141414] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-3 md:items-start md:px-8">
        <div>
          <p className="text-sm font-bold tracking-wide">{COMPANY_NAME}</p>
          <p className="mt-2 max-w-xs text-sm font-normal leading-relaxed text-white/70">
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

        <p className="text-xs font-semibold uppercase leading-relaxed tracking-[0.14em] text-white/80 md:text-right">
          Get the workforce
          <br />
          <span className="text-[#F51EA0]">that works.</span>
        </p>
      </div>

      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45">
        {portalCopyright()}
      </p>
    </footer>
  );
}
