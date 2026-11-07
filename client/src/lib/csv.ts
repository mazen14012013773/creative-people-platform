const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value).replace(/"/g, '""');

  return /[",\n\r]/.test(text) ? `"${text}"` : text;
};

export const downloadCsv = (
  filename: string,
  rows: Array<Array<string | number | null | undefined>>,
): void => {
  const content = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const csvFilename = (prefix: string): string => {
  const stamp = new Date().toISOString().slice(0, 10);

  return `mabdeen-${prefix}-${stamp}.csv`;
};
