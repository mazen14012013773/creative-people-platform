import { Check, Copy, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { getProfileUrl } from '@/lib/profile-share';
import type { PublicFreelancer } from '@/types';

interface ShareProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: PublicFreelancer;
}

export const ShareProfileModal = ({ open, onClose, profile }: ShareProfileModalProps) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const profileUrl = getProfileUrl(profile.id);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setQrFailed(false);
    QRCode.toDataURL(profileUrl, {
      width: 640,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f766e', light: '#ffffff' },
    }).then((value) => {
      if (active) setQrDataUrl(value);
    }).catch(() => {
      if (active) setQrFailed(true);
    });
    return () => { active = false; };
  }, [open, profileUrl]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success('تم نسخ رابط البروفايل');
    } catch {
      setManualCopy(true);
      toast.error('تعذر النسخ التلقائي؛ انسخ الرابط يدويًا من الحقل أدناه.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="رابط البروفايل" size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <p className="text-sm font-extrabold text-brand-900">{profile.name}</p>
          <p className="mt-0.5 text-xs font-semibold text-brand-700">{profile.title || 'مبدع'}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 bg-white p-1.5 ps-3">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-xs font-semibold text-slate-600">{profileUrl}</span>
            <button type="button" onClick={copyLink} className="btn btn-primary btn-sm shrink-0">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </button>
          </div>
          {manualCopy ? <input readOnly dir="ltr" value={profileUrl} onFocus={(event) => event.currentTarget.select()} className="input mt-2 text-start text-xs" aria-label="رابط البروفايل للنسخ اليدوي" /> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2"><QrCode className="size-4 text-brand-700" /><p className="text-sm font-extrabold text-slate-900">رمز QR للبروفايل</p></div>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
            <div className="theme-keep-light flex size-36 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
              {qrDataUrl ? <img src={qrDataUrl} alt={`رمز QR لبروفايل ${profile.name}`} className="size-full rounded-xl object-contain" /> : qrFailed ? <p className="px-2 text-center text-[11px] font-semibold text-rose-600">تعذر إنشاء رمز QR</p> : <Spinner className="size-6 text-brand-700" />}
            </div>
            <div className="text-center sm:text-start">
              <p className="text-xs font-semibold leading-6 text-slate-500">يمكنك تنزيل الرمز وإضافته إلى مواد المسابقة أو ملف الأعمال.</p>
              {qrDataUrl ? <a href={qrDataUrl} download={`qr-${profile.name.replace(/\s+/g, '-')}.png`} className="btn btn-secondary btn-sm mt-3"><Download className="size-4" />تنزيل رمز QR</a> : null}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
