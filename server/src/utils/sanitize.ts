import DOMPurify from 'isomorphic-dompurify';

/** Store user supplied descriptions and review text as plain text. */
export const sanitizePlainText = (value: string): string =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
