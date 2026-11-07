import DOMPurify from 'dompurify';

/** Sanitize user supplied plain text before it is presented in the UI. */
export const sanitizeText = (value: string | null | undefined): string => {
  if (!value) return '';
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};
