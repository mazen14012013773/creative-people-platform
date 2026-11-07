export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export const CHAT_ATTACHMENT_ACCEPT = `${IMAGE_ACCEPT},application/pdf,text/plain,text/html,application/json,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg`;
export const ORDER_DELIVERY_ACCEPT = CHAT_ATTACHMENT_ACCEPT;
export const COMMUNITY_COMMENT_ACCEPT = `${IMAGE_ACCEPT},application/pdf,text/plain,video/mp4,video/webm,video/quicktime`;

export const CHAT_ATTACHMENT_MAX_SIZE = 15 * 1024 * 1024;
export const ORDER_DELIVERY_MAX_SIZE = 25 * 1024 * 1024;
export const ORDER_DELIVERY_MAX_FILES = 5;

export const CHAT_ATTACHMENT_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, PDF, TXT, HTML, JSON, MP4, WEBM, MOV, MP3, WAV, OGG';
export const ORDER_DELIVERY_EXTENSIONS_LABEL = CHAT_ATTACHMENT_EXTENSIONS_LABEL;
export const COMMUNITY_COMMENT_EXTENSIONS_LABEL = 'JPG, PNG, WEBP, GIF, PDF, TXT, MP4, WEBM, MOV';
