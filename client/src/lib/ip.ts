const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;
const IPV4_MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;

export const normalizeIp = (value: string): string => {
  const ip = value.trim().toLowerCase();
  const mapped = IPV4_MAPPED.exec(ip);

  if (mapped) {
    return mapped[1];
  }

  const hexMapped = IPV4_MAPPED_HEX.exec(ip);

  if (hexMapped) {
    const high = Number.parseInt(hexMapped[1], 16);
    const low = Number.parseInt(hexMapped[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }

  return ip;
};

export const isLocalOrPrivateIp = (value: string): boolean => {
  const ip = normalizeIp(value);

  if (ip === 'localhost' || ip === '::' || ip === '::1') {
    return true;
  }

  if (IPV4.test(ip)) {
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

  return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
};
