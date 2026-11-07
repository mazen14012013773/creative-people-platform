import { Code2, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { PortfolioItem } from '@/types';
import { sanitizeText } from '@/lib/sanitize';
import { ProtectedImage } from '@/components/common/ProtectedMedia';

export const PortfolioModal = ({
  item,
  onClose,
}: {
  item: PortfolioItem | null;
  onClose: () => void;
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const preventSaveShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ['s', 'u', 'p'].includes(key) || event.key === 'F12') {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', preventSaveShortcuts, true);
    return () => window.removeEventListener('keydown', preventSaveShortcuts, true);
  }, [item]);

  if (!item) {
    return null;
  }

  const showImage = Boolean(item.imageUrl) && !imageFailed;

  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item.title} size="lg" onContextMenu={(event) => event.preventDefault()}>
      <div className="overflow-hidden rounded-2xl bg-slate-100" onContextMenu={(event) => event.preventDefault()}>
        {showImage ? (
          <ProtectedImage
            containerClassName="w-full"
            src={item.imageUrl ?? undefined}
            alt={item.title}
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="max-h-[60vh] w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center text-brand-700/70">
            <FolderOpen className="size-12" />
            <span className="text-sm font-bold">معاينة المشروع</span>
            {item.imageUrl && imageFailed ? (
              <>
                <span className="max-w-sm text-xs font-semibold leading-6 text-slate-500">
                  تعذر تحميل الصورة من رابطها الخارجي. قد يكون الرابط غير مباشر أو
                  الموقع يمنع العرض خارج صفحاته.
                </span>
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-700 underline underline-offset-4"
                >
                  فتح رابط الصورة
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>

      {item.description ? (
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">
          {sanitizeText(item.description)}
        </p>
      ) : null}

      {item.projectUrl ? (
        <a
          href={item.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary mt-5"
        >
          <Code2 className="size-4" />
          فتح GitHub
        </a>
      ) : null}
    </Modal>
  );
};
