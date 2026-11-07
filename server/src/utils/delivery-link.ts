const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'youtu.be'];
const GOOGLE_DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];
const OTHER_VIDEO_HOSTS = [
  'vimeo.com', 'dailymotion.com', 'twitch.tv', 'tiktok.com', 'facebook.com', 'fb.watch',
  'instagram.com', 'streamable.com', 'rumble.com', 'loom.com', 'kick.com',
];
const VIDEO_PATH = /\.(?:mp4|m4v|mov|webm|m3u8|mpd)(?:$|\/)/i;

const isHost = (host: string, domains: string[]): boolean => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
const isPrivateIpv4 = (host: string): boolean => {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
};
const isIpLiteral = (host: string): boolean => host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
const isStandardPort = (url: URL): boolean => !url.port ||
  (url.protocol === 'https:' && url.port === '443') ||
  (url.protocol === 'http:' && url.port === '80');

export type DeliveryLinkKind = 'youtube' | 'google-drive' | 'website';

/**
 * Classifies a delivery URL. Video hosts must be YouTube or Google Drive;
 * generic websites are accepted only over HTTPS and without credentials,
 * IP literals, private hosts or non-standard ports.
 */
export const classifyDeliveryLink = (value: string): DeliveryLinkKind | null => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !isStandardPort(url)) return null;
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || isPrivateIpv4(host) || isIpLiteral(host)) return null;

    const youtube = isHost(host, YOUTUBE_HOSTS);
    const drive = isHost(host, GOOGLE_DRIVE_HOSTS);
    const videoHost = isHost(host, OTHER_VIDEO_HOSTS);
    const directVideo = VIDEO_PATH.test(url.pathname);
    if (videoHost || directVideo) return youtube ? 'youtube' : drive ? 'google-drive' : null;

    return url.protocol === 'https:' ? 'website' : null;
  } catch {
    return null;
  }
};

export const isValidDeliveryLink = (value: string): boolean => classifyDeliveryLink(value) !== null;
