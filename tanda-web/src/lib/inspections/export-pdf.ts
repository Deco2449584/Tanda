import { COMPANY_NAME } from '@/lib/types/company-settings';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const BRAND_ACCENT = '#10B981';
const BLACK = '#0A0A0A';
const DARK = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
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
        `<img src="${escapeAttr(src)}" alt="Evidence photo ${index + 1}" class="photo-evidence-img" />`,
    )
    .join('');

  return `<div class="photo-grid">${photosHtml}</div>`;
}

function buildVideoEvidenceCardsHtml(videoUrls: readonly string[]): string {
  if (videoUrls.length === 0) {
    return '<p class="empty-evidence">No video evidence captured for this inspection.</p>';
  }

  return videoUrls
    .map((url, index) => {
      const clipIndex = index + 1;
      return `<div class="video-card">
        <div class="video-card-header">
          <span class="video-badge">VIDEO CLIP ${clipIndex}</span>
        </div>
        <div class="video-card-body">
          <a href="${escapeAttr(url)}" class="video-stream-btn">Open video evidence</a>
          <span class="video-url-fallback">${escapeHtml(url)}</span>
        </div>
      </div>`;
    })
    .join('');
}

function buildMediaReferenceLinks(urls: readonly string[], label: string): string {
  if (urls.length === 0) {
    return `<p class="muted">No ${escapeHtml(label.toLowerCase())} files.</p>`;
  }

  const items = urls
    .map(
      (url, index) =>
        `<li class="reference-item">
          <a href="${escapeAttr(url)}" class="evidence-link">${escapeHtml(label)} ${index + 1}</a>
          <span class="link-url">${escapeHtml(url)}</span>
        </li>`,
    )
    .join('');

  return `<ul class="reference-list">${items}</ul>`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
): string {
  const photoCount = inspection.photoEvidence.length;
  const videoCount = inspection.videoEvidence.length;
  const visualPhotosHtml = buildVisualPhotoEvidenceHtml(photoSources);
  const videoCardsHtml = buildVideoEvidenceCardsHtml(inspection.videoEvidence);

  const statusLabel = inspection.hasIssues ? 'REQUIRES ATTENTION' : 'LOADED';
  const statusClass = inspection.hasIssues ? 'status-warn' : 'status-ok';

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
  <title>Inspection ${escapeHtml(inspection.uldId)}</title>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; color: ${DARK}; font-size: 13px; line-height: 1.5; margin: 0; }
    .header { background: ${BLACK}; color: #fff; padding: 28px 32px; }
    .header-app { font-size: 22px; font-weight: 800; letter-spacing: 0.3px; }
    .header-app span { color: ${BRAND_ACCENT}; }
    .header-sub { font-size: 12px; color: #9CA3AF; margin-top: 6px; }
    .accent-bar { height: 4px; background: ${BRAND_ACCENT}; }
    .hero { padding: 24px 32px 16px; border-bottom: 1px solid ${BORDER}; }
    .hero-title { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
    .hero-sub { color: ${MUTED}; font-size: 15px; margin: 0; }
    .status { display: inline-block; margin-top: 12px; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; }
    .status-ok { background: ${BRAND_ACCENT}22; color: ${BRAND_ACCENT}; }
    .status-warn { background: #FEF3C7; color: #B45309; }
    .section { padding: 20px 32px; page-break-inside: avoid; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px; color: ${DARK}; }
    .subsection-title { font-size: 15px; font-weight: 700; margin: 0 0 14px; color: ${DARK}; }
    .data-table { width: 100%; border-collapse: collapse; border: 1px solid ${BORDER}; border-radius: 8px; overflow: hidden; }
    .data-table th { width: 38%; text-align: left; padding: 10px 14px; background: #F9FAFB; font-size: 11px; text-transform: uppercase; color: ${MUTED}; border-bottom: 1px solid ${BORDER}; vertical-align: top; }
    .data-table td { padding: 10px 14px; font-size: 14px; font-weight: 600; border-bottom: 1px solid ${BORDER}; }
    .data-table tr:last-child th, .data-table tr:last-child td { border-bottom: none; }
    .issue-alert { margin-top: 16px; padding: 14px 16px; border-radius: 10px; border: 2px solid ${ALERT_RED}; background: ${ALERT_RED_BG}; }
    .issue-alert-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: ${ALERT_RED}; letter-spacing: 0.4px; margin-bottom: 8px; }
    .issue-alert-body { font-size: 14px; color: #7F1D1D; line-height: 1.55; white-space: pre-wrap; }
    .media-summary { display: flex; flex-wrap: wrap; gap: 16px 32px; padding: 12px 14px; background: #F9FAFB; border: 1px solid ${BORDER}; border-radius: 8px; margin-bottom: 16px; }
    .media-summary p { margin: 0; font-size: 14px; font-weight: 600; }
    .photo-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px; margin-top: 8px; }
    .photo-evidence-img { width: 200px; max-width: calc(50% - 12px); height: auto; margin: 10px; border-radius: 5px; border: 1px solid ${BORDER}; display: block; object-fit: cover; page-break-inside: avoid; }
    .video-cards { display: flex; flex-direction: column; gap: 14px; }
    .video-card { background: linear-gradient(135deg, #f4f4f4 0%, #e8f0fe 100%); border: 1px solid ${BORDER}; border-radius: 12px; padding: 16px 18px; page-break-inside: avoid; }
    .video-card-header { margin-bottom: 12px; }
    .video-badge { display: inline-block; font-size: 12px; font-weight: 800; letter-spacing: 0.5px; color: ${DARK}; background: #fff; border-radius: 20px; padding: 6px 12px; border: 1px solid ${BORDER}; }
    .video-card-body { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .video-stream-btn { display: inline-block; background: ${BRAND_ACCENT}; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 18px; border-radius: 8px; }
    .video-url-fallback { font-size: 10px; color: ${MUTED}; word-break: break-all; line-height: 1.4; }
    .reference-group { margin-bottom: 16px; }
    .reference-subtitle { font-size: 12px; font-weight: 700; text-transform: uppercase; color: ${MUTED}; margin: 0 0 8px; }
    .reference-list { list-style: none; padding: 0; margin: 0; }
    .reference-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid ${BORDER}; word-break: break-all; }
    .reference-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .evidence-link { color: ${BRAND_ACCENT}; font-weight: 700; font-size: 14px; text-decoration: underline; display: inline-block; margin-bottom: 4px; }
    .link-url { display: block; font-size: 10px; color: ${MUTED}; line-height: 1.4; }
    .empty-evidence { color: ${MUTED}; font-size: 14px; font-style: italic; margin: 0; padding: 12px 0; }
    .muted { color: ${MUTED}; font-size: 13px; }
    .footer { padding: 20px 32px; font-size: 11px; color: ${MUTED}; text-align: center; border-top: 1px solid ${BORDER}; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-app">Continental <span>Inspect</span></div>
    <div class="header-sub">Cargo inspection report · ${escapeHtml(COMPANY_NAME)}</div>
  </div>
  <div class="accent-bar"></div>
  <div class="hero">
    <h1 class="hero-title">${escapeHtml(inspection.uldId)}</h1>
    <p class="hero-sub">AWB ${escapeHtml(inspection.awbNumber)}</p>
    <span class="status ${statusClass}">${escapeHtml(statusLabel)}</span>
  </div>
  <div class="section">
    <h2 class="section-title">Inspected container</h2>
    ${dataTable}
    ${issueAlert}
  </div>
  <div class="section">
    <h2 class="section-title">Media summary</h2>
    <div class="media-summary">
      <p>Photos Attached: ${photoCount}</p>
      <p>Videos Attached: ${videoCount}</p>
    </div>
  </div>
  <div class="section">
    <h3 class="subsection-title">Visual Photo Evidence</h3>
    ${visualPhotosHtml}
  </div>
  <div class="section">
    <h2 class="section-title">Video evidence</h2>
    <div class="video-cards">${videoCardsHtml}</div>
  </div>
  <div class="section">
    <h2 class="section-title">Cloud evidence references</h2>
    <p class="muted" style="margin-top:0;margin-bottom:16px;">Links to original files in Firebase Storage.</p>
    <div class="reference-group">
      <h3 class="reference-subtitle">Photos</h3>
      ${buildMediaReferenceLinks(inspection.photoEvidence, 'Photo')}
    </div>
    <div class="reference-group">
      <h3 class="reference-subtitle">Videos</h3>
      ${buildMediaReferenceLinks(inspection.videoEvidence, 'Video')}
    </div>
  </div>
  <div class="footer">
    <div>Continental Inspect · ${escapeHtml(COMPANY_NAME)}</div>
    <div>Generated ${escapeHtml(formatInspectionDate(new Date().toISOString()))}</div>
  </div>
</body>
</html>`;
}

export async function exportCargoInspectionPdf(
  inspection: CargoInspection,
): Promise<void> {
  const photoSources =
    inspection.photoEvidence.length > 0
      ? await resolvePhotoSourcesForPdf(inspection.photoEvidence)
      : [];

  const html = buildInspectionHtml(inspection, photoSources);
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
