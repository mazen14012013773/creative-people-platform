import { Download, Eye, FileText, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/services/api';

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} بايت`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} ك.ب`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

export const isPreviewableMime = (mimeType: string): boolean =>
  mimeType.startsWith('image/') ||
  mimeType.startsWith('video/') ||
  mimeType.startsWith('audio/') ||
  mimeType === 'application/pdf' ||
  mimeType.startsWith('text/') ||
  mimeType === 'application/json';

interface AdminProtectedFileProps {
  name: string;
  mimeType: string;
  size: number;
  fetchBlob: (download: boolean) => Promise<Blob>;
  compact?: boolean;
}

export const AdminProtectedFile = ({
  name,
  mimeType,
  size,
  fetchBlob,
  compact = false,
}: AdminProtectedFileProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const releasePreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPreviewUrl(null);
  };

  const preview = async () => {
    if (previewUrl) {
      releasePreview();
      return;
    }

    setPreviewLoading(true);
    setError(null);

    try {
      const blob = await fetchBlob(false);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreviewUrl(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'تعذر تحميل الملف للمعاينة.'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setError(null);

    try {
      const blob = await fetchBlob(true);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'تعذر تحميل الملف.'));
    } finally {
      setDownloading(false);
    }
  };

  const previewable = isPreviewableMime(mimeType);

  return (
    <div className={compact ? 'space-y-2' : 'rounded-xl border border-slate-200 bg-white p-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-4 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-slate-800" title={name}>{name}</p>
          <p className="text-[10px] font-semibold text-slate-400">
            {formatFileSize(size)} · {mimeType}
          </p>
        </div>
        {previewable ? (
          <button type="button" onClick={() => void preview()} className="btn btn-secondary btn-sm" disabled={previewLoading}>
            {previewLoading ? <Loader2 className="size-3.5 animate-spin" /> : previewUrl ? <X className="size-3.5" /> : <Eye className="size-3.5" />}
            {previewUrl ? 'إغلاق المعاينة' : 'معاينة'}
          </button>
        ) : null}
        <button type="button" onClick={() => void download()} className="btn btn-secondary btn-sm" disabled={downloading}>
          {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          تحميل
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700">{error}</p>
      ) : null}

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {mimeType.startsWith('image/') ? (
            <img src={previewUrl} alt={name} className="mx-auto max-h-80 w-auto object-contain" />
          ) : mimeType.startsWith('video/') ? (
            <video src={previewUrl} controls className="mx-auto max-h-80 w-full bg-black" />
          ) : mimeType.startsWith('audio/') ? (
            <audio src={previewUrl} controls className="w-full p-3" />
          ) : mimeType === 'application/pdf' ? (
            <iframe title={name} src={previewUrl} className="h-96 w-full bg-white" />
          ) : (
            <iframe title={name} src={previewUrl} className="h-96 w-full bg-white" sandbox="" />
          )}
        </div>
      ) : null}
    </div>
  );
};
