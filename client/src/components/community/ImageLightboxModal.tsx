import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ImageLightboxModalProps {
  src: string;
  title: string;
  onClose: () => void;
}

export const ImageLightboxModal = ({ src, title, onClose }: ImageLightboxModalProps) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [onClose]);

  return createPortal(<div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative flex max-h-[94vh] max-w-[96vw] items-center justify-center">
      <button type="button" onClick={onClose} className="absolute -top-2 -end-2 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg transition hover:scale-105 hover:bg-cyan-700" aria-label="إغلاق الصورة"><X className="size-5"/></button>
      <img src={src} alt={title} className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
      <p className="absolute inset-x-3 bottom-3 truncate rounded-xl bg-black/55 px-3 py-2 text-center text-sm font-bold text-white backdrop-blur">{title}</p>
    </div>
  </div>, document.body);
};
