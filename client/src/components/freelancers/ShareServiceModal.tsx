import { Check, Copy, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';

interface ShareServiceModalProps {
  open: boolean;
  onClose: () => void;
  freelancerId: string;
  service: { id: string; title: string } | null;
}

export const getServicePath = (freelancerId: string, serviceId: string) => {
  const params = new URLSearchParams({ serviceId });
  return `/freelancers/${encodeURIComponent(freelancerId)}?${params.toString()}`;
};

export const getServiceUrl = (freelancerId: string, serviceId: string) =>
  new URL(getServicePath(freelancerId, serviceId), window.location.origin).toString();

export const ShareServiceModal = ({ open, onClose, freelancerId, service }: ShareServiceModalProps) => {
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const serviceUrl = service ? getServiceUrl(freelancerId, service.id) : '';

  useEffect(() => {
    if (!open || !serviceUrl) return;
    let active = true;
    setQrDataUrl('');
    setQrFailed(false);
    QRCode.toDataURL(serviceUrl, { width: 640, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0f766e', light: '#ffffff' } })
      .then((value) => { if (active) setQrDataUrl(value); })
      .catch(() => { if (active) setQrFailed(true); });
    return () => { active = false; };
  }, [open, serviceUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(serviceUrl);
      setCopied(true);
      toast.success('\u062a\u0645 \u0646\u0633\u062e \u0631\u0627\u0628\u0637 \u0627\u0644\u062e\u062f\u0645\u0629');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setManualCopy(true);
      toast.error('\u062a\u0639\u0630\u0631 \u0627\u0644\u0646\u0633\u062e \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a\u061b \u0627\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637 \u064a\u062f\u0648\u064a\u064b\u0627 \u0645\u0646 \u0627\u0644\u062d\u0642\u0644 \u0623\u062f\u0646\u0627\u0647.');
    }
  };

  return (
    <Modal open={open && Boolean(service)} onClose={onClose} title={'\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u062e\u062f\u0645\u0629'} size="md">
      {service ? <div className="space-y-5" dir="rtl">
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <p className="text-sm font-extrabold text-brand-900">{service.title}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-brand-200 bg-white p-1.5 ps-3">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-xs font-semibold text-slate-600">{serviceUrl}</span>
            <button type="button" onClick={copyLink} className="btn btn-primary btn-sm shrink-0">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e' : '\u0646\u0633\u062e \u0627\u0644\u0631\u0627\u0628\u0637'}
            </button>
          </div>
          {manualCopy ? <input readOnly dir="ltr" value={serviceUrl} onFocus={(event) => event.currentTarget.select()} className="input mt-2 text-start text-xs" aria-label="\u0631\u0627\u0628\u0637 \u0627\u0644\u062e\u062f\u0645\u0629 \u0644\u0644\u0646\u0633\u062e \u0627\u0644\u064a\u062f\u0648\u064a" /> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2"><QrCode className="size-4 text-brand-700" /><p className="text-sm font-extrabold text-slate-900">{'\u0631\u0645\u0632 QR \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0644\u0644\u062e\u062f\u0645\u0629'}</p></div>
          <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
            <div className="theme-keep-light flex size-36 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2">
              {qrDataUrl ? <img src={qrDataUrl} alt={`\u0631\u0645\u0632 QR \u0644\u062e\u062f\u0645\u0629 ${service.title}`} className="size-full rounded-xl object-contain" /> : qrFailed ? <p className="px-2 text-center text-[11px] font-semibold text-rose-600">{'\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0631\u0645\u0632 QR'}</p> : <Spinner className="size-6 text-brand-700" />}
            </div>
            <div className="text-center sm:text-start">
              <p className="text-xs font-semibold leading-6 text-slate-500">{'\u0627\u0645\u0633\u062d \u0627\u0644\u0631\u0645\u0632 \u0644\u0641\u062a\u062d \u0627\u0644\u062e\u062f\u0645\u0629 \u0645\u0628\u0627\u0634\u0631\u0629 \u0648\u0645\u0631\u0627\u0633\u0644\u0629 \u0627\u0644\u0645\u0633\u062a\u0642\u0644 \u0644\u0637\u0644\u0628\u0647\u0627.'}</p>
              {qrDataUrl ? <a href={qrDataUrl} download={`service-${service.id}-qr.png`} className="btn btn-secondary btn-sm mt-3"><Download className="size-4" />{'\u062a\u0646\u0632\u064a\u0644 QR'}</a> : null}
            </div>
          </div>
        </div>
      </div> : null}
    </Modal>
  );
};
