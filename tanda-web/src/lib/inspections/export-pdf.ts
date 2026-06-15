import {
  PORTAL_COMPANY_TAGLINE,
  PORTAL_NAVY,
  PORTAL_NAVY_LIGHT,
  PORTAL_ACCENT,
} from '@/lib/portal/portal-brand';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SURFACE = '#F8FAFC';
const ALERT_RED = '#B91C1C';
const ALERT_RED_BG = '#FEF2F2';

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

function tableRow(label: string, value: string): string {
  return `<tr>
    <th>${escapeHtml(label)}</th>
    <td>${escapeHtml(value)}</td>
  </tr>`;
}

function buildVisualPhotoEvidenceHtml(photoSources: readonly string[]): string {
  if (photoSources.length === 0) {
    return '<p class="empty-evidence">No photo evidence captured for this inspection.</p>';
  }

  const photosHtml = photoSources
    .map(
      (src, index) =>
        `<figure class="photo-figure">
          <img src="${escapeAttr(src)}" alt="Evidence photo ${index + 1}" class="photo-evidence-img" />
          <figcaption>Photo ${index + 1}</figcaption>
        </figure>`,
    )
    .join('');

  return `<div class="photo-grid">${photosHtml}</div>`;
}

function buildMediaAccessLinks(
  urls: readonly string[],
  label: string,
): string {
  if (urls.length === 0) {
    return `<p class="empty-evidence">No ${escapeHtml(label.toLowerCase())} files attached.</p>`;
  }

  const items = urls
    .map(
      (url, index) =>
        `<li class="access-item">
          <a href="${escapeAttr(url)}" class="access-link">
            <span class="access-index">${index + 1}</span>
            <span class="access-text">${escapeHtml(label)} ${index + 1} — open in browser</span>
          </a>
        </li>`,
    )
    .join('');

  return `<ul class="access-list">${items}</ul>`;
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
    const response = await fetch('/logo.svg');
    if (!response.ok) return null;
    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function resolvePhotoSourceForPdf(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const blob = await response.blob();
    return blobToDataUrl(blob);
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
  const photoCount = inspection.photoEvidence.length;
  const videoCount = inspection.videoEvidence.length;
  const visualPhotosHtml = buildVisualPhotoEvidenceHtml(photoSources);
  const videoLinksHtml = buildMediaAccessLinks(inspection.videoEvidence, 'Video clip');
  const photoLinksHtml = buildMediaAccessLinks(inspection.photoEvidence, 'Photo');

  const statusLabel = inspection.hasIssues ? 'REQUIRES ATTENTION' : 'LOADED';
  const statusClass = inspection.hasIssues ? 'status-warn' : 'status-ok';

  const logoHtml = logoDataUrl
    ? `<img src="${escapeAttr(logoDataUrl)}" alt="${escapeAttr(COMPANY_NAME)}" class="header-logo" />`
    : `<div class="header-logo-text">${escapeHtml(COMPANY_NAME)}</div>`;

  const issueAlert = inspection.hasIssues
    ? `<div class="issue-alert">
        <div class="issue-alert-title">Inspection issue reported</div>
        <div class="issue-alert-body">${escapeHtml(inspection.issueDescription?.trim() || 'No description provided.')}</div>
      </div>`
    : '';

  const dataTable = `
    <table class="data-table">
      <tbody>
        ${tableRow('ULD ID', inspection.uldId)}
        ${tableRow('AWB Number', inspection.awbNumber)}
        ${tableRow('Conservation', getConservationLabel(inspection.conservationType))}
        ${tableRow('Food Type', inspection.foodType)}
        ${tableRow('Weight (Kg)', String(inspection.weightKg))}
        ${tableRow('Box Count', String(inspection.boxCount))}
        ${tableRow('Has Issues', inspection.hasIssues ? 'Yes' : 'No')}
        ${tableRow('Inspector Email', inspection.createdBy)}
        ${tableRow('Inspection Date', formatInspectionDate(inspection.registeredAt))}
        ${inspection.updatedAt ? tableRow('Last Updated', formatInspectionDate(inspection.updatedAt)) : ''}
      </tbody>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(COMPANY_NAME)} — Inspection ${escapeHtml(inspection.uldId)}</title>
  <style>
    body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #0F172A; font-size: 13px; line-height: 1.5; margin: 0; background: #fff; }
    .header { background: ${PORTAL_NAVY}; color: #fff; padding: 28px 36px 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .header-brand { display: flex; align-items: center; gap: 20px; min-width: 0; }
    .header-logo { height: 56px; width: auto; max-width: 200px; object-fit: contain; filter: brightness(0) invert(1); }
    .header-logo-text { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header-meta { text-align: right; flex-shrink: 0; }
    .header-report { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.55); }
    .header-title { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .header-tagline { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 2px; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, ${PORTAL_ACCENT}, ${PORTAL_NAVY_LIGHT}); }
    .hero { padding: 28px 36px 20px; border-bottom: 1px solid ${BORDER}; background: ${SURFACE}; }
    .hero-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: ${PORTAL_ACCENT}; margin: 0 0 8px; }
    .hero-title { font-size: 30px; font-weight: 800; margin: 0 0 4px; color: ${PORTAL_NAVY}; letter-spacing: -0.02em; }
    .hero-sub { color: ${MUTED}; font-size: 15px; margin: 0; }
    .status { display: inline-block; margin-top: 14px; padding: 6px 14px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
    .status-ok { background: #DCFCE7; color: #166534; }
    .status-warn { background: #FEF3C7; color: #B45309; }
    .section { padding: 22px 36px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; margin: 0 0 14px; color: ${PORTAL_NAVY}; }
    .subsection-title { font-size: 14px; font-weight: 700; margin: 0 0 12px; color: #0F172A; }
    .data-table { width: 100%; border-collapse: collapse; border: 1px solid ${BORDER}; border-radius: 10px; overflow: hidden; }
    .data-table th { width: 36%; text-align: left; padding: 11px 16px; background: ${SURFACE}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: ${MUTED}; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
    .data-table td { padding: 11px 16px; font-size: 14px; font-weight: 600; border-bottom: 1px solid ${BORDER}; color: #0F172A; }
    .data-table tr:last-child th, .data-table tr:last-child td { border-bottom: none; }
    .issue-alert { margin-top: 18px; padding: 16px 18px; border-radius: 12px; border: 1px solid #FECACA; background: ${ALERT_RED_BG}; }
    .issue-alert-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${ALERT_RED}; letter-spacing: 0.08em; margin-bottom: 8px; }
    .issue-alert-body { font-size: 14px; color: #7F1D1D; line-height: 1.55; white-space: pre-wrap; }
    .media-summary { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 4px; }
    .media-stat { flex: 1; min-width: 140px; padding: 14px 16px; background: ${SURFACE}; border: 1px solid ${BORDER}; border-radius: 10px; }
    .media-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${MUTED}; }
    .media-stat-value { font-size: 22px; font-weight: 800; color: ${PORTAL_NAVY}; margin-top: 4px; }
    .photo-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
    .photo-figure { margin: 0; page-break-inside: avoid; }
    .photo-evidence-img { width: 220px; max-width: 100%; height: auto; border-radius: 8px; border: 1px solid ${BORDER}; display: block; object-fit: cover; }
    .photo-figure figcaption { margin-top: 6px; font-size: 11px; color: ${MUTED}; font-weight: 600; }
    .access-panel { background: ${SURFACE}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 18px 20px; }
    .access-note { margin: 0 0 14px; font-size: 12px; color: ${MUTED}; line-height: 1.5; }
    .access-group { margin-bottom: 18px; }
    .access-group:last-child { margin-bottom: 0; }
    .access-subtitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: ${PORTAL_NAVY}; margin: 0 0 10px; }
    .access-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .access-item { margin: 0; }
    .access-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; border: 1px solid ${BORDER}; border-radius: 8px; text-decoration: none; color: ${PORTAL_NAVY}; }
    .access-index { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: ${PORTAL_NAVY}; color: #fff; font-size: 12px; font-weight: 800; flex-shrink: 0; }
    .access-text { font-size: 13px; font-weight: 700; }
    .empty-evidence { color: ${MUTED}; font-size: 13px; font-style: italic; margin: 0; padding: 8px 0; }
    .footer { padding: 22px 36px 28px; font-size: 11px; color: ${MUTED}; border-top: 1px solid ${BORDER}; background: ${SURFACE}; }
    .footer-brand { font-size: 12px; font-weight: 700; color: ${PORTAL_NAVY}; margin-bottom: 4px; }
    .footer-note { margin-top: 10px; font-size: 10px; line-height: 1.5; color: #94A3B8; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      ${logoHtml}
    </div>
    <div class="header-meta">
      <div class="header-report">Cargo inspection report</div>
      <div class="header-title">${escapeHtml(COMPANY_NAME)}</div>
      <div class="header-tagline">${escapeHtml(PORTAL_COMPANY_TAGLINE)}</div>
    </div>
  </div>
  <div class="accent-bar"></div>
  <div class="hero">
    <p class="hero-kicker">Shipment unit</p>
    <h1 class="hero-title">${escapeHtml(inspection.uldId)}</h1>
    <p class="hero-sub">AWB ${escapeHtml(inspection.awbNumber)}</p>
    <span class="status ${statusClass}">${escapeHtml(statusLabel)}</span>
  </div>
  <div class="section">
    <h2 class="section-title">Inspection details</h2>
    ${dataTable}
    ${issueAlert}
  </div>
  <div class="section">
    <h2 class="section-title">Evidence summary</h2>
    <div class="media-summary">
      <div class="media-stat">
        <div class="media-stat-label">Photos</div>
        <div class="media-stat-value">${photoCount}</div>
      </div>
      <div class="media-stat">
        <div class="media-stat-label">Videos</div>
        <div class="media-stat-value">${videoCount}</div>
      </div>
    </div>
  </div>
  <div class="section">
    <h2 class="section-title">Photo evidence</h2>
    ${visualPhotosHtml}
  </div>
  <div class="section">
    <h2 class="section-title">Media access links</h2>
    <div class="access-panel">
      <p class="access-note">Use the links below to open photo and video files in your browser. Save or share them from there if needed.</p>
      <div class="access-group">
        <h3 class="access-subtitle">Videos</h3>
        ${videoLinksHtml}
      </div>
      <div class="access-group">
        <h3 class="access-subtitle">Photos (full resolution)</h3>
        ${photoLinksHtml}
      </div>
    </div>
  </div>
  <div class="footer">
    <div class="footer-brand">${escapeHtml(COMPANY_NAME)} · ${escapeHtml(PORTAL_COMPANY_TAGLINE)}</div>
    <div>Report generated ${escapeHtml(formatInspectionDate(new Date().toISOString()))}</div>
    <div class="footer-note">Media links may expire after a period of time. Export a fresh report from the portal or admin console for current access.</div>
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
  }, 300);
}
