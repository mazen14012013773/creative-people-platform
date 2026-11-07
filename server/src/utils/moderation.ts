export type ModerationSeverity = 'low' | 'medium' | 'high';

export interface ModerationHit {
  rule: string;
  severity: ModerationSeverity;
  excerpt: string;
}

export interface ModerationResult {
  hits: ModerationHit[];
  cleaned: string;
  suggestion: string | null;
  blocked: boolean;
}

/** Terms that are never allowed anywhere on the platform. */
const BLOCKED_TERMS = [
  'بيع حساب',
  'بيع متابعين',
  'حسابات وهميه',
  'حسابات وهمية',
  'تسريب بيانات',
  'بطاقات مسروقة',
  'احتيال',
  'نصب',
  'تحيل',
  'مخدرات',
  'اسلحة',
  'أسلحة',
  'قمار',
  'راهنة',
  'قرصنه',
  'قرصنة',
  'hack this',
  'ddos',
  'carding',
  'cash app scam',
  'فحش',
  'اباحي',
  'porn',
  'sharmota',
];

const MARKUP_PATTERN = /<[a-z][\s\S]*>/i;
const EXTERNAL_LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const OFF_PLATFORM_HANDLER_PATTERN =
  /\b(?:t\.me|telegram\.me|wa\.me|instagram\.com|x\.com|twitter\.com|facebook\.com|snaptube|bit\.ly)\b[^\s]*/gi;
const BARE_PHONE_PATTERN = /(?:\+?\d[\d\s-]{8,15}\d)/g;
const REPEATED_CHAR_PATTERN = /(.)\1{9,}/g;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/g;

const clip = (value: string, max = 180): string => {
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const pushHit = (
  hits: ModerationHit[],
  rule: string,
  severity: ModerationSeverity,
  excerpt: string,
): void => {
  hits.push({ rule, severity, excerpt: clip(excerpt.trim()) });
};

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Flags text that breaks the direct-contact-only policy of the directory.
 * The scanner flags off-platform contact data in user-written text.
 */
export const scanText = (
  value: string,
  options: { allowLinks?: boolean; allowPhone?: boolean; extraTerms?: string[] } = {},
): ModerationHit[] => {
  const hits: ModerationHit[] = [];
  const blockedTerms = [...BLOCKED_TERMS, ...(options.extraTerms ?? [])];
  const lowercased = value.toLowerCase();

  for (const term of blockedTerms) {
    const needle = term.toLowerCase();

    if (needle && lowercased.includes(needle)) {
      pushHit(hits, 'blocked_term', 'high', term);
    }
  }

  if (MARKUP_PATTERN.test(value)) {
    pushHit(hits, 'markup_injection', 'low', value.match(MARKUP_PATTERN)![0]);
  }

  const links = value.match(EXTERNAL_LINK_PATTERN) ?? [];
  const firstLink = links[0];

  if (!options.allowLinks && firstLink) {
    pushHit(hits, 'external_link', 'medium', firstLink);
  }

  const handlers = value.match(OFF_PLATFORM_HANDLER_PATTERN) ?? [];
  const firstHandler = handlers[0];

  if (firstHandler) {
    pushHit(hits, 'off_platform_contact', 'medium', firstHandler);
  }

  if (!options.allowPhone) {
    const phones = value.match(BARE_PHONE_PATTERN) ?? [];

    for (const phone of phones) {
      const digits = phone.replace(/\D/g, '');

      if (digits.length >= 9) {
        pushHit(hits, 'phone_in_free_text', 'medium', phone);
        break;
      }
    }
  }

  const emails = value.match(EMAIL_PATTERN) ?? [];
  const firstEmail = emails[0];

  if (firstEmail) {
    pushHit(hits, 'email_in_free_text', 'low', firstEmail);
  }

  const repeated = value.match(REPEATED_CHAR_PATTERN);

  if (repeated?.[0]) {
    pushHit(hits, 'spam_repetition', 'low', repeated[0]);
  }

  return hits;
};

export const worstSeverity = (hits: ModerationHit[]): ModerationSeverity | null => {
  if (hits.some((hit) => hit.severity === 'high')) {
    return 'high';
  }

  if (hits.some((hit) => hit.severity === 'medium')) {
    return 'medium';
  }

  return hits.length > 0 ? 'low' : null;
};

/** Removes links, handles and long digit runs that violate the contact policy. */
export const buildCleanupSuggestion = (value: string): string | null => {
  const stripped = value
    .replace(OFF_PLATFORM_HANDLER_PATTERN, '')
    .replace(EXTERNAL_LINK_PATTERN, '')
    .replace(BARE_PHONE_PATTERN, '')
    .replace(REPEATED_CHAR_PATTERN, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return stripped.length > 0 ? stripped : null;
};

export const moderateText = (
  value: string,
  options: { allowLinks?: boolean; allowPhone?: boolean; extraTerms?: string[] } = {},
): ModerationResult => {
  const hits = scanText(value, options);
  const suggestion = hits.some((hit) => hit.rule !== 'markup_injection')
    ? buildCleanupSuggestion(value)
    : null;

  return {
    hits,
    cleaned: collapseWhitespace(value),
    suggestion,
    blocked: hits.some((hit) => hit.severity === 'high'),
  };
};

export const moderationLabel = (rule: string): string => {
  switch (rule) {
    case 'blocked_term':
      return 'مصطلح محظور';
    case 'external_link':
      return 'رابط خارجي';
    case 'off_platform_contact':
      return 'تواصل خارج المنصة';
    case 'phone_in_free_text':
      return 'رقم هاتف في نص حر';
    case 'email_in_free_text':
      return 'بريد إلكتروني في نص حر';
    case 'markup_injection':
      return 'كود HTML';
    case 'spam_repetition':
      return 'تكرار عشوائي';
    default:
      return rule;
  }
};
