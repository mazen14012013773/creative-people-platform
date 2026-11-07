export type MimeExtensionMap = Record<string, string>;

export const IMAGE_MIME_EXTENSIONS: MimeExtensionMap = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const SERVICE_MEDIA_EXTENSIONS: MimeExtensionMap = {
  ...IMAGE_MIME_EXTENSIONS,
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export const CHAT_FILE_EXTENSIONS: MimeExtensionMap = {
  ...IMAGE_MIME_EXTENSIONS,
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/html': 'html',
  'application/json': 'json',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
};

export const ORDER_DELIVERY_EXTENSIONS: MimeExtensionMap = {
  ...CHAT_FILE_EXTENSIONS,
};

export const COMMENT_FILE_EXTENSIONS: MimeExtensionMap = {
  ...IMAGE_MIME_EXTENSIONS,
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export const REPORT_PROOF_EXTENSIONS: MimeExtensionMap = {
  ...IMAGE_MIME_EXTENSIONS,
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

export const IMAGE_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF';
export const SERVICE_MEDIA_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, MP4, WEBM, MOV';
export const CHAT_FILE_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, PDF, TXT, HTML, JSON, MP4, WEBM, MOV, MP3, WAV, OGG';
export const ORDER_DELIVERY_EXTENSIONS_LABEL = CHAT_FILE_EXTENSIONS_LABEL;
export const COMMENT_FILE_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, PDF, TXT, MP4, WEBM, MOV';
export const REPORT_PROOF_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, PDF, TXT';

export const rejectedFileMessage = (originalName: string, allowedLabel: string): string => {
  const trimmed = originalName.trim();
  const extension = trimmed.includes('.') ? `.${trimmed.split('.').pop()!.toLowerCase()}` : '';
  return `نوع الملف${extension ? ` بامتداد ${extension}` : ''} غير مسموح. الامتدادات المسموحة: ${allowedLabel}.`;
};
