
const HEAD_BYTES = 512;

const isUtf8Text = (bytes: Buffer): boolean => {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
    return true;
  } catch {
    return false;
  }
};

const matchesSignatureHead = (mimetype: string, bytes: Buffer): boolean => {
  switch (mimetype) {
    case 'image/jpeg':
      return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString('ascii'));
    case 'image/webp':
      return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf':
      return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'application/json': {
      if (!isUtf8Text(bytes)) return false;
      const trimmed = bytes.toString('utf8').trimStart();
      return trimmed.startsWith('{') || trimmed.startsWith('[');
    }
    case 'text/plain':
    case 'text/html':
      return isUtf8Text(bytes);
    case 'audio/mpeg':
      return bytes.length > 2 && (bytes.subarray(0, 3).toString('ascii') === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
    case 'audio/wav':
      return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE';
    case 'audio/ogg':
      return bytes.subarray(0, 4).toString('ascii') === 'OggS';
    case 'video/mp4':
    case 'video/quicktime':
      return bytes.length > 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'video/webm':
      return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
};

export const matchesFileSignature = (buffer: Buffer, mimetype: string): boolean =>
  matchesSignatureHead(mimetype, buffer.subarray(0, HEAD_BYTES));
