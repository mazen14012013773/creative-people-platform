const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'youtu.be'];
const GOOGLE_HOSTS = ['drive.google.com', 'docs.google.com'];
const OTHER_VIDEO_HOSTS = ['vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com', 'facebook.com', 'fb.watch', 'instagram.com', 'streamable.com', 'rumble.com', 'loom.com', 'kick.com'];
const VIDEO_PATH = /\.(?:mp4|m4v|mov|webm|m3u8|mpd)(?:$|\/)/i;
const belongsTo = (host: string, domains: string[]) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
const isPrivateIpv4 = (host: string) => {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
};
const isIpLiteral = (host: string) => host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
const isStandardPort = (url: URL) => !url.port ||
  (url.protocol === 'https:' && url.port === '443') ||
  (url.protocol === 'http:' && url.port === '80');

export interface DeliveryLinkPreview { kind: 'youtube' | 'google-drive' | 'website'; embedUrl: string; externalUrl: string; }

export const extractDeliveryUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value.trim().length > 2048) return null;
    return url.toString();
  } catch { return null; }
};

export const classifyDeliveryLink = (value: string): DeliveryLinkPreview['kind'] | null => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !isStandardPort(url)) return null;
    if (typeof window !== 'undefined' && url.origin === window.location.origin) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || host.startsWith('[') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || isPrivateIpv4(host) || isIpLiteral(host)) return null;
    const youtube = belongsTo(host, YOUTUBE_HOSTS);
    const drive = belongsTo(host, GOOGLE_HOSTS);
    const videoHost = belongsTo(host, OTHER_VIDEO_HOSTS);
    const directVideo = VIDEO_PATH.test(url.pathname);
    if (videoHost || directVideo) return youtube ? 'youtube' : drive ? 'google-drive' : null;
    return url.protocol === 'https:' ? 'website' : null;
  } catch { return null; }
};

export const isAllowedDeliveryLink = (value: string): boolean => classifyDeliveryLink(value) !== null;

export const resolveDeliveryLinkPreview = (value: string): DeliveryLinkPreview | null => {
  try {
    const externalUrl = extractDeliveryUrl(value);
    if (!externalUrl) return null;
    const url = new URL(externalUrl);
    const kind = classifyDeliveryLink(url.toString());
    if (!kind) return null;
    if (url.origin === window.location.origin) return null;
    const host = url.hostname.toLowerCase();
    if (kind === 'youtube') {
      const match = host === 'youtu.be'
        ? url.pathname.split('/').filter(Boolean)[0]
        : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,20})/)?.[1] ?? url.searchParams.get('v');
      if (match && /^[\w-]{6,20}$/.test(match)) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${match}?rel=0&controls=1&playsinline=1`, externalUrl: url.toString() };
    }
    if (kind === 'google-drive') {
      const id = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id');
      if (id && /^[\w-]+$/.test(id)) return { kind: 'google-drive', embedUrl: `https://drive.google.com/file/d/${id}/preview`, externalUrl: url.toString() };
    }
    return { kind: 'website', embedUrl: url.toString(), externalUrl: url.toString() };
  } catch { return null; }
};
