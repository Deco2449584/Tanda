import { BRAND } from '@/lib/brand/tokens';
import { PORTAL_COMPANY_TAGLINE, PORTAL_CONTACT } from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import { formatInspectionDate } from '@/lib/inspections/format';
import { resolveInspectionMapsUrl } from '@/lib/inspections/inspection-maps-url';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { getInspectionListStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const INK = '#1A1A1A';
const MUTED = '#6B6B6B';
const LINE = '#E6E6E6';
const WASH = '#F7F7F7';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function detailItem(label: string, value: string | null | undefined): string {
  const text = value?.trim();
  if (!text) return '';
  return `<div class="detail-item">
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(text)}</dd>
  </div>`;
}

function detailLink(label: string, href: string, linkLabel: string): string {
  return `<div class="detail-item">
    <dt>${escapeHtml(label)}</dt>
    <dd><a class="map-link" href="${escapeAttr(href)}" target="_blank" rel="noreferrer">${escapeHtml(linkLabel)}</a></dd>
  </div>`;
}

function buildVisualPhotoEvidenceHtml(photoSources: readonly string[]): string {
  if (photoSources.length === 0) {
    return '<p class="empty">No photo evidence captured for this inspection.</p>';
  }

  return `<div class="photo-grid">${photoSources
    .map(
      (src, index) =>
        `<figure class="photo-card">
          <img src="${escapeAttr(src)}" alt="Evidence photo ${index + 1}" />
          <figcaption>Photo ${index + 1}</figcaption>
        </figure>`,
    )
    .join('')}</div>`;
}

function buildVideoLinks(urls: readonly string[]): string {
  if (urls.length === 0) {
    return '<p class="empty">No video clips attached.</p>';
  }

  return `<ul class="link-list">${urls
    .map(
      (url, index) =>
        `<li>
          <a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">
            <span class="link-index">${index + 1}</span>
            <span>Open video clip ${index + 1}</span>
          </a>
        </li>`,
    )
    .join('')}</ul>`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resolveLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/logos/logo-horizontal.png');
    if (!response.ok) return null;
    return blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

async function resolvePhotoSourceForPdf(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    return blobToDataUrl(await response.blob());
  } catch {
    return url;
  }
}

async function resolvePhotoSourcesForPdf(urls: readonly string[]): Promise<string[]> {
  return Promise.all(urls.map((url) => resolvePhotoSourceForPdf(url)));
}

function buildInspectionHtml(
  inspection: CargoInspection,
  photoSources: readonly string[],
  logoDataUrl: string | null,
): string {
  const status = getInspectionListStatus(inspection);
  const mapsUrl = resolveInspectionMapsUrl(inspection);
  const statusClass =
    status.label === 'REQUIRES ATTENTION'
      ? 'badge-warn'
      : status.label === 'NEW'
        ? 'badge-new'
        : 'badge-ok';

  const logoHtml = logoDataUrl
    ? `<img src="${escapeAttr(logoDataUrl)}" alt="${escapeAttr(COMPANY_NAME)}" class="brand-logo" />`
    : `<div class="brand-fallback">${escapeHtml(COMPANY_NAME)}</div>`;

  const detailsHtml = `
    <dl class="detail-grid">
      ${detailItem('Site / client', inspection.clientLocationName)}
      ${detailItem('ULD ID', inspection.uldId)}
      ${detailItem('AWB number', inspection.awbNumber)}
      ${detailItem('Conservation', getConservationLabel(inspection.conservationType))}
      ${detailItem('Food type', inspection.foodType)}
      ${detailItem('Weight', `${inspection.weightKg} kg`)}
      ${detailItem('Boxes', String(inspection.boxCount))}
      ${
        typeof inspection.temperatureCelsius === 'number'
          ? detailItem('Temperature', `${inspection.temperatureCelsius} °C`)
          : ''
      }
      ${detailItem('Exit vehicle plate', inspection.exitVehiclePlate)}
      ${detailItem('Driver', inspection.driverName)}
      ${detailItem('Transport company', inspection.transportCompany)}
      ${detailItem('Inspector', inspection.createdBy)}
      ${detailItem('Registered', formatInspectionDate(inspection.registeredAt))}
      ${
        inspection.dispatchedAt
          ? detailItem('Loaded on truck', formatInspectionDate(inspection.dispatchedAt))
          : ''
      }
      ${
        inspection.updatedAt && !inspection.dispatchedAt
          ? detailItem('Last updated', formatInspectionDate(inspection.updatedAt))
          : ''
      }
      ${
        inspection.issueReportedAt
          ? detailItem('Issue reported', formatInspectionDate(inspection.issueReportedAt))
          : ''
      }
      ${
        mapsUrl
          ? detailLink('Registration location', mapsUrl, 'View on map')
          : ''
      }
    </dl>`;

  const issueBlock = inspection.hasIssues
    ? `<section class="issue-block">
        <h2>Issue reported</h2>
        <p>${escapeHtml(inspection.issueDescription?.trim() || 'No description provided.')}</p>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(COMPANY_NAME)} — Inspection ${escapeHtml(inspection.uldId)}</title>
  <style>
    @page { margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: ${INK};
      background: #fff;
      font-family: Poppins, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.45;
    }
    .sheet { max-width: 860px; margin: 0 auto; }
    .masthead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 22px 26px;
      background: ${BRAND.graphite};
      color: #fff;
    }
    .brand-logo {
      height: 52px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      display: block;
    }
    .brand-fallback {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .masthead-meta { text-align: right; }
    .masthead-kicker {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }
    .masthead-title {
      margin-top: 4px;
      font-size: 16px;
      font-weight: 700;
    }
    .masthead-sub {
      margin-top: 2px;
      font-size: 11px;
      color: rgba(255,255,255,0.65);
    }
    .accent {
      height: 3px;
      background: linear-gradient(90deg, ${BRAND.magenta} 0%, ${BRAND.charcoal} 100%);
    }
    .hero {
      padding: 24px 26px 18px;
      border-bottom: 1px solid ${LINE};
      background: ${WASH};
    }
    .hero-label {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: ${BRAND.magenta};
    }
    .hero h1 {
      margin: 0;
      font-family: Poppins, "Segoe UI", Arial, sans-serif;
      font-size: 28px;
      font-weight: 400;
      letter-spacing: 0.01em;
      color: ${INK};
    }
    .hero-awb {
      margin: 6px 0 0;
      color: ${MUTED};
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      margin-top: 14px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }
    .badge-ok { background: #E8F8EE; color: #166534; }
    .badge-new { background: #E8F2FF; color: #1D4ED8; }
    .badge-warn { background: #FFF4E5; color: #B45309; }
    .section { padding: 20px 26px; }
    .section h2 {
      margin: 0 0 14px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: ${BRAND.graphite};
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin: 0;
      border: 1px solid ${LINE};
      border-radius: 12px;
      overflow: hidden;
      background: #fff;
    }
    .detail-item {
      display: grid;
      gap: 4px;
      padding: 12px 14px;
      border-bottom: 1px solid ${LINE};
      border-right: 1px solid ${LINE};
      background: #fff;
    }
    .detail-item:nth-child(2n) { border-right: none; }
    .detail-item dt {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${MUTED};
    }
    .detail-item dd {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: ${INK};
    }
    .map-link {
      color: ${BRAND.magenta};
      font-weight: 700;
      text-decoration: none;
      border-bottom: 1px solid rgba(245, 30, 160, 0.35);
    }
    .issue-block {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid #FECACA;
      background: #FEF2F2;
    }
    .issue-block h2 {
      margin: 0 0 8px;
      color: #B91C1C;
    }
    .issue-block p {
      margin: 0;
      color: #7F1D1D;
      white-space: pre-wrap;
      line-height: 1.55;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat {
      padding: 14px 16px;
      border: 1px solid ${LINE};
      border-radius: 12px;
      background: ${WASH};
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: ${MUTED};
    }
    .stat-value {
      margin-top: 4px;
      font-size: 24px;
      font-weight: 800;
      color: ${INK};
    }
    .photo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .photo-card {
      margin: 0;
      page-break-inside: avoid;
    }
    .photo-card img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 10px;
      border: 1px solid ${LINE};
      background: ${WASH};
      object-fit: cover;
    }
    .photo-card figcaption {
      margin-top: 6px;
      font-size: 11px;
      font-weight: 600;
      color: ${MUTED};
    }
    .link-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }
    .link-list a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid ${LINE};
      border-radius: 10px;
      text-decoration: none;
      color: ${INK};
      background: ${WASH};
      font-weight: 700;
    }
    .link-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: ${BRAND.graphite};
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .empty {
      margin: 0;
      color: ${MUTED};
      font-style: italic;
    }
    .footer {
      margin-top: 8px;
      padding: 18px 26px 24px;
      border-top: 1px solid ${LINE};
      background: ${WASH};
      color: ${MUTED};
      font-size: 11px;
    }
    .footer strong {
      display: block;
      margin-bottom: 4px;
      color: ${INK};
      font-size: 12px;
    }
    .footer-note {
      margin-top: 10px;
      font-size: 10px;
      line-height: 1.5;
      color: #8A8A8A;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .section, .photo-card, .issue-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="masthead">
      <div>${logoHtml}</div>
      <div class="masthead-meta">
        <div class="masthead-kicker">Cargo inspection report</div>
        <div class="masthead-title">${escapeHtml(COMPANY_NAME)}</div>
        <div class="masthead-sub">${escapeHtml(PORTAL_COMPANY_TAGLINE)} · ${escapeHtml(PORTAL_CONTACT.location)}</div>
      </div>
    </header>
    <div class="accent"></div>

    <section class="hero">
      <p class="hero-label">Shipment unit</p>
      <h1>${escapeHtml(inspection.uldId)}</h1>
      <p class="hero-awb">AWB ${escapeHtml(inspection.awbNumber)}</p>
      <span class="badge ${statusClass}">${escapeHtml(status.label)}</span>
    </section>

    <section class="section">
      <h2>Inspection details</h2>
      ${detailsHtml}
      ${issueBlock}
    </section>

    <section class="section">
      <h2>Evidence summary</h2>
      <div class="stats">
        <div class="stat">
          <div class="stat-label">Photos</div>
          <div class="stat-value">${inspection.photoEvidence.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Videos</div>
          <div class="stat-value">${inspection.videoEvidence.length}</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Photo evidence</h2>
      ${buildVisualPhotoEvidenceHtml(photoSources)}
    </section>

    <section class="section">
      <h2>Video access</h2>
      ${buildVideoLinks(inspection.videoEvidence)}
    </section>

    <footer class="footer">
      <strong>${escapeHtml(COMPANY_NAME)} · ${escapeHtml(PORTAL_COMPANY_TAGLINE)}</strong>
      <div>Generated ${escapeHtml(formatInspectionDate(new Date().toISOString()))}</div>
      <div>${escapeHtml(PORTAL_CONTACT.email)} · ${escapeHtml(PORTAL_CONTACT.phone)}</div>
      <div class="footer-note">Video links may expire. Export a fresh report from the portal for current access. Location is shared as a map link only — coordinates are not printed.</div>
    </footer>
  </div>
</body>
</html>`;
}

export async function exportCargoInspectionPdf(
  inspection: CargoInspection,
): Promise<void> {
  const [photoSources, logoDataUrl] = await Promise.all([
    inspection.photoEvidence.length > 0
      ? resolvePhotoSourcesForPdf(inspection.photoEvidence)
      : Promise.resolve([]),
    resolveLogoDataUrl(),
  ]);

  const html = buildInspectionHtml(inspection, photoSources, logoDataUrl);
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups to export the PDF.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}
