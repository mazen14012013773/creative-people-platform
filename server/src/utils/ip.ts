import { isIP } from 'node:net';

const IPV4_MAPPED_DOTTED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const IPV4_MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;

const expandMappedHex = (ip: string): string | null => {
  const match = IPV4_MAPPED_HEX.exec(ip);

  if (!match) {
    return null;
  }

  const high = Number.parseInt(match[1], 16);
  const low = Number.parseInt(match[2], 16);

  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
};

// Node reports IPv4 clients on dual-stack servers as `::ffff:a.b.c.d`; block
// storage and lookup must both use the canonical IPv4 value.
export const normalizeIpAddress = (value: string): string => {
  let ip = value.trim().toLowerCase();

  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  const zoneIndex = ip.indexOf('%');

  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  const dotted = IPV4_MAPPED_DOTTED.exec(ip);

  if (dotted) {
    return dotted[1];
  }

  return expandMappedHex(ip) ?? ip;
};

export const isLocalOrPrivateIp = (value: string): boolean => {
  const ip = normalizeIpAddress(value);
  const version = isIP(ip);

  if (version === 4) {
    const [first, second] = ip.split('.').map(Number);

    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (version === 6) {
    return (
      ip === '::' ||
      ip === '::1' ||
      /^f[cd]/.test(ip) ||
      /^fe[89ab]/.test(ip)
    );
  }

  return false;
};
