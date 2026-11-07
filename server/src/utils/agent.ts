const pick = (userAgent: string, patterns: Array<[RegExp, string]>): string => {
  for (const [pattern, label] of patterns) {
    if (pattern.test(userAgent)) {
      return label;
    }
  }

  return 'غير معروف';
};

export const describeBrowser = (userAgent: string): string => {
  return pick(userAgent, [
    [/\bEdg\//i, 'Edge'],
    [/OPR\/|Opera/i, 'Opera'],
    [/SamsungBrowser/i, 'Samsung Internet'],
    [/CriOS/i, 'Chrome iOS'],
    [/Chrome\/|Chromium/i, 'Chrome'],
    [/Firefox\/|FxiOS/i, 'Firefox'],
    [/Safari\//i, 'Safari'],
  ]);
};

export const describeDevice = (userAgent: string): string => {
  if (/iPad/i.test(userAgent)) {
    return 'iPad';
  }

  if (/iPhone|iPod|Android.*Mobile/i.test(userAgent)) {
    return 'هاتف';
  }

  if (/Android|Tablet/i.test(userAgent)) {
    return 'تابلت';
  }

  if (/Windows/i.test(userAgent)) {
    return 'Windows';
  }

  if (/Mac OS X|Macintosh/i.test(userAgent)) {
    return 'macOS';
  }

  if (/Linux/i.test(userAgent)) {
    return 'Linux';
  }

  return 'غير معروف';
};

export const describeAgent = (userAgent: string): string => {
  if (!userAgent) {
    return 'وكيل مجهول';
  }

  return `${describeBrowser(userAgent)} · ${describeDevice(userAgent)}`;
};
