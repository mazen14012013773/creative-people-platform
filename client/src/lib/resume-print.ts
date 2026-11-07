import { sanitizeText } from './sanitize';
import { formatDate, formatNumber, getInitials } from './utils';
import type {
  FreelancerStats,
  PortfolioItem,
  PublicFreelancer,
  Review,
  Skill,
} from '@/types';

// يُعتمد الطباعة من المتصفح بدل مكتبات PDF لأنها تحافظ على تشكيل النص العربي وتتعامل مع الألوان،
// بينما jsPDF/html2canvas يكسران التشكيل ويعجزان عن قراءة ألوان oklch في Tailwind v4.

export interface ResumePrintData {
  profile: PublicFreelancer;
  skills: Skill[];
  stats: FreelancerStats;
  portfolio: PortfolioItem[];
  reviews: Review[];
}

export interface ResumePrintOptions {
  includeAvatar: boolean;
  includePortfolio: boolean;
  includeStats: boolean;
  includeReviews: boolean;
}

export const MAX_RESUME_REVIEWS = 3;

export const DEFAULT_RESUME_OPTIONS: ResumePrintOptions = {
  includeAvatar: true,
  includePortfolio: true,
  includeStats: true,
  includeReviews: true,
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escAttr = (value: string | null | undefined): string =>
  escapeHtml(value ?? '');

const text = (value: string | number | null | undefined): string =>
  sanitizeText(String(value ?? ''));

const safeHttpUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }

  try {
    const resolved = new URL(url.trim(), window.location.origin);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
};

const displayUrl = (href: string): string => {
  const value = href.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return value.length > 38 ? `${value.slice(0, 38)}…` : value;
};

const safeFormatDate = (value: string): string => {
  try {
    return formatDate(value);
  } catch {
    return '';
  }
};

const formatResponseTime = (hours: number | null): string => {
  if (hours === null) {
    return 'غير محدد';
  }
  if (hours < 1) {
    return 'أقل من ساعة';
  }
  if (hours === 1) {
    return 'خلال ساعة';
  }
  if (hours === 2) {
    return 'خلال ساعتين';
  }
  if (hours <= 10) {
    return `خلال ${formatNumber(hours)} ساعات`;
  }
  return `خلال ${formatNumber(hours)} ساعة`;
};

const renderStars = (rating: number): string => {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `<span class="stars" aria-hidden="true">${'★'.repeat(filled)}<span class="star-off">${'☆'.repeat(5 - filled)}</span></span>`;
};

const renderSection = (title: string, body: string): string =>
  body
    ? `<section class="section"><h2 class="section-title">${text(title)}</h2>${body}</section>`
    : '';

interface ProfileDetail {
  label: string;
  value: string;
}

const buildProfileDetails = (profile: PublicFreelancer): ProfileDetail[] => {
  const entries: ProfileDetail[] = [];
  if (profile.location) {
    entries.push({ label: 'الموقع', value: profile.location });
  }


  entries.push({
    label: 'متوسط زمن الرد',
    value: formatResponseTime(profile.avgResponseHours),
  });

  return entries;
};

const renderProfileDetails = (profile: PublicFreelancer): string => {
  const entries = buildProfileDetails(profile);
  if (entries.length === 0) {
    return '';
  }

  const items = entries
    .map((entry) => {
      return `<div class="contact"><span class="contact-label">${text(entry.label)}</span><span class="contact-value">${text(entry.value)}</span></div>`;
    })
    .join('');

  return `<div class="contacts">${items}</div>`;
};

const renderHeader = (
  profile: PublicFreelancer,
  options: ResumePrintOptions,
): string => {
  const avatarSrc = options.includeAvatar ? safeHttpUrl(profile.avatarUrl) : null;

  let avatarHtml = '';
  if (options.includeAvatar) {
    avatarHtml = avatarSrc
      ? `<img class="avatar" src="${escAttr(avatarSrc)}" alt="${escAttr(profile.name)}" onerror="this.style.display='none'" />`
      : `<div class="avatar avatar-fallback">${text(getInitials(profile.name))}</div>`;
  }

  const verifiedBadge = profile.isVerified
    ? `<span class="badge badge-verified">✓ حساب موثّق</span>`
    : '';
  const availabilityBadge = profile.isAvailable
    ? `<span class="badge badge-available">متاح للعمل</span>`
    : `<span class="badge badge-busy">غير متاح حاليًا</span>`;

  return `<header class="resume-header">
  <div class="header-top">
    ${avatarHtml}
    <div class="header-id">
      <p class="header-eyebrow">السيرة الذاتية — منصة مبدعين</p>
      <h1 class="header-name">${text(profile.name)}${verifiedBadge}</h1>
      <p class="header-role">${text(profile.title || 'مستقل على مبدعين')}</p>
      <div class="header-badges">${availabilityBadge}</div>
    </div>
  </div>
  ${renderProfileDetails(profile)}
</header>`;
};

const renderBio = (bio: string | null): string =>
  renderSection(
    'نبذة عني',
    bio ? `<p class="bio">${text(bio)}</p>` : '',
  );

const renderSkills = (skills: Skill[]): string => {
  if (skills.length === 0) {
    return '';
  }
  const chips = skills
    .map((skill) => `<span class="chip">${text(skill.name)}</span>`)
    .join('');
  return renderSection('المهارات', `<div class="chips">${chips}</div>`);
};

const renderPortfolio = (items: PortfolioItem[]): string => {
  if (items.length === 0) {
    return '';
  }

  const cards = items
    .map((item) => {
      const imgSrc = safeHttpUrl(item.imageUrl);
      const projectHref = safeHttpUrl(item.projectUrl);

      return `<article class="pf-card">
    ${imgSrc ? `<img class="pf-img" src="${escAttr(imgSrc)}" alt="${escAttr(item.title)}" onerror="this.style.display='none'" />` : ''}
    <div class="pf-body">
      <p class="pf-title">${text(item.title)}</p>
      ${item.description ? `<p class="pf-desc">${text(item.description)}</p>` : ''}
      ${projectHref ? `<a class="pf-link ltr" dir="ltr" href="${escAttr(projectHref)}">${text(displayUrl(projectHref))}</a>` : ''}
    </div>
  </article>`;
    })
    .join('');

  return renderSection('أعمال مختارة', `<div class="pf-grid">${cards}</div>`);
};

const renderStats = (stats: FreelancerStats): string => {
  const avg = stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'جديد';

  return renderSection(
    'التقييم والأداء',
    `<div class="rating-box">
    <div class="stat-pill stat-highlight">
      <span class="stat-value">${text(avg)}</span>
      ${renderStars(stats.avgRating)}
      <span class="stat-label">${text(`${formatNumber(stats.reviewCount)} تقييم`)} من العملاء</span>
    </div>
    <div class="stat-pill">
      <span class="stat-value">${text(formatNumber(stats.viewCount))}</span>
      <span class="stat-label">زيارة البروفايل</span>
    </div>
  </div>`,
  );
};

const renderReviews = (reviews: Review[]): string => {
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const items = sorted.slice(0, MAX_RESUME_REVIEWS);
  if (items.length === 0) {
    return '';
  }

  const cards = items
    .map(
      (review) => `<div class="review">
    <div class="review-head">
      <p class="review-client">${text(review.clientName)}</p>
      ${renderStars(review.rating)}
    </div>
    ${review.comment ? `<p class="review-comment">«${text(review.comment)}»</p>` : ''}
    <p class="review-date">${text(safeFormatDate(review.createdAt))}</p>
  </div>`,
    )
    .join('');

  return renderSection('آراء العملاء', cards);
};

const PRINT_STYLES = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: #ffffff; }
body {
  font-family: "Segoe UI", Tahoma, "Noto Naskh Arabic", sans-serif;
  color: #1f2937;
  background: #ffffff;
  font-size: 12px;
  line-height: 1.75;
  padding: 18px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page { max-width: 182mm; margin: 0 auto; }
.ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }
a { color: #0d6f6b; text-decoration: none; }
.print-hint {
  background: #fbf8eb;
  border: 1px solid #ecdf9c;
  color: #7f5a1e;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
}
.resume-header {
  background-color: #0d6f6b;
  background-image: linear-gradient(135deg, #072e2e 0%, #0d6f6b 62%, #11a89d 100%);
  color: #ffffff;
  border-radius: 18px;
  padding: 20px 22px;
}
.header-top { display: flex; align-items: center; gap: 18px; }
.avatar {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  object-fit: cover;
  border: 3px solid #ffffff;
  background: #072e2e;
  flex-shrink: 0;
}
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  color: #eefcf9;
}
.header-eyebrow { font-size: 11px; font-weight: 700; color: #a8f0e4; }
.header-name {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
  margin-top: 2px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 800;
}
.badge-verified { background: #d4af37; color: #33210d; }
.badge-available { background: #1ebe5b; color: #ffffff; }
.badge-busy { background: #f5f2ea; color: #684a1f; }
.header-role { font-size: 13px; font-weight: 700; color: #d2f8f0; margin-top: 2px; }
.header-badges { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
.contacts {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #71e3d5;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 16px;
}
.contact { min-width: 0; }
.contact-label { display: block; font-size: 10px; font-weight: 700; color: #a8f0e4; }
.contact-value,
.resume-header .contact-value,
.resume-header a.contact-value {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  overflow-wrap: anywhere;
}
.section { margin-top: 18px; }
.section-title {
  font-size: 15px;
  font-weight: 800;
  color: #0d6f6b;
  border-bottom: 2px solid #d2f8f0;
  padding-bottom: 5px;
  margin-bottom: 10px;
}
.bio { white-space: pre-line; color: #334155; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-block;
  border: 1px solid #a8f0e4;
  background: #eefcf9;
  color: #105956;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 11.5px;
  font-weight: 700;
}
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pf-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
}
.pf-img { display: block; width: 100%; height: 130px; object-fit: cover; background: #f1f5f9; }
.pf-body { padding: 10px 13px 12px; }
.pf-title { font-size: 13px; font-weight: 800; color: #0f172a; }
.pf-desc { margin-top: 3px; font-size: 11.5px; color: #475569; }
.pf-link {
  margin-top: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: #0c8a83;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.rating-box { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 10px; }
.stat-pill {
  border: 1px solid #d2f8f0;
  background: #eefcf9;
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
}
.stat-highlight { background: #fbf8eb; border-color: #ecdf9c; }
.stat-value { display: block; font-size: 20px; font-weight: 800; color: #0d6f6b; }
.stat-highlight .stat-value { color: #a17721; }
.stat-label { display: block; margin-top: 2px; font-size: 10.5px; font-weight: 700; color: #64748b; }
.stars { display: inline-block; color: #d4af37; font-size: 14px; letter-spacing: 2px; }
.stars .star-off { color: #cbd5e1; }
.review { border: 1px solid #e2e8f0; border-radius: 14px; padding: 10px 13px; background: #fbfdfe; }
.review + .review { margin-top: 10px; }
.review-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.review-client { font-size: 12.5px; font-weight: 800; color: #0f172a; }
.review-comment { margin-top: 4px; font-size: 11.5px; color: #475569; white-space: pre-line; }
.review-date { margin-top: 4px; font-size: 10px; font-weight: 700; color: #94a3b8; }
.footer {
  margin-top: 20px;
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}
@media print {
  body { padding: 0; font-size: 11px; }
  .print-hint { display: none; }
  .resume-header, .pf-card, .review, .contact, .stat-pill, .chip {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .section-title { break-after: avoid; page-break-after: avoid; }
  a { color: #0d6f6b; text-decoration: none; }
}
`;

const PRINT_HINT_HTML = `<div class="print-hint">ستفتح نافذة الطباعة تلقائيًا — اختر «حفظ كـ PDF» أو «Save as PDF» كوجهة للطباعة، ثم احفظ الملف.</div>`;

const PRINT_TRIGGER_SCRIPT = [
  'var printed = false;',
  'function triggerPrint() { if (printed) return; printed = true; window.focus(); window.print(); }',
  'window.onload = function () { window.setTimeout(triggerPrint, 400); };',
  'window.setTimeout(triggerPrint, 3500);',
].join('\n');

const buildResumeDocument = (
  data: ResumePrintData,
  options: ResumePrintOptions,
): string => {
  const { profile, skills, stats, portfolio, reviews } = data;

  const body = [
    `<div class="page">`,
    PRINT_HINT_HTML,
    renderHeader(profile, options),
    renderBio(profile.bio),
    renderSkills(skills),
    options.includePortfolio ? renderPortfolio(portfolio) : '',
    options.includeStats ? renderStats(stats) : '',
    options.includeReviews ? renderReviews(reviews) : '',
    `<footer class="footer">${text(`سيرة ذاتية أنشئت عبر منصة مبدعين · ${safeFormatDate(new Date().toISOString())}`)}</footer>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    '<!doctype html>',
    '<html dir="rtl" lang="ar">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${text(`${profile.name} — السيرة الذاتية`)}</title>`,
    `<style>${PRINT_STYLES}</style>`,
    '</head>',
    `<body>${body}<script>${PRINT_TRIGGER_SCRIPT}<\/script></body>`,
    '</html>',
  ].join('\n');
};

export const openResumePrintWindow = (
  data: ResumePrintData,
  options: ResumePrintOptions,
): boolean => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(buildResumeDocument(data, options));
  printWindow.document.close();
  return true;
};
