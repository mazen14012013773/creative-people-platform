import { readFileSync } from 'node:fs';
import { clientIndexFile } from '../config/paths';
import { findPublicFreelancerById } from '../models/freelancer.model';

let cachedTemplate: string | null = null;

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const truncate = (value: string, maxLength: number): string => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
};

const getTemplate = (): string | null => {
  if (cachedTemplate) {
    return cachedTemplate;
  }

  try {
    cachedTemplate = readFileSync(clientIndexFile, 'utf8');
    return cachedTemplate;
  } catch {
    return null;
  }
};

const setMeta = (html: string, key: string, content: string): string => {
  const usesName = key === 'description' || key.startsWith('twitter:');
  const attribute = usesName ? 'name' : 'property';
  const tag = `<meta data-seo="${key}" ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(`<meta\\s+data-seo="${key}"[^>]*>`);

  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  return html.replace('</head>', `    ${tag}\n  </head>`);
};

const setCanonical = (html: string, url: string): string => {
  const tag = `<link data-seo="canonical" rel="canonical" href="${escapeHtml(url)}" />`;
  const pattern = /<link\s+data-seo="canonical"[^>]*>/;

  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  return html.replace('</head>', `    ${tag}\n  </head>`);
};

const absoluteImageUrl = (
  imageUrl: string | null,
  origin: string,
): string => {
  if (!imageUrl) {
    return `${origin}/images/mabdeen-logo.jpg`;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return `${origin}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

export const buildProfilePageHtml = async (
  freelancerId: string,
  origin: string,
): Promise<string | null> => {
  const profile = await findPublicFreelancerById(freelancerId);

  if (!profile) {
    return null;
  }

  const template = getTemplate();

  if (!template) {
    return null;
  }

  const role = profile.title || 'مستقل';
  const pageTitle = `${profile.name} — ${role} | مبدعين`;
  const socialTitle = `${profile.name} — ${role}`;
  const locationText = profile.location ? ` من ${profile.location}` : '';
  const description = profile.bio
    ? truncate(profile.bio, 175)
    : `${profile.name}، ${role}${locationText}. شاهد معرض الأعمال والخدمات وابدأ محادثة داخلية آمنة.`;
  const profileUrl = `${origin}/freelancers/${profile.id}`;
  const imageUrl = absoluteImageUrl(profile.avatarUrl, origin);

  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(pageTitle)}</title>`,
  );

  html = setMeta(html, 'description', description);
  html = setMeta(html, 'og:type', 'profile');
  html = setMeta(html, 'og:title', socialTitle);
  html = setMeta(html, 'og:description', description);
  html = setMeta(html, 'og:url', profileUrl);
  html = setMeta(html, 'og:image', imageUrl);
  html = setMeta(html, 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'twitter:title', socialTitle);
  html = setMeta(html, 'twitter:description', description);
  html = setMeta(html, 'twitter:image', imageUrl);

  html = setCanonical(html, profileUrl);

  return html;
};
