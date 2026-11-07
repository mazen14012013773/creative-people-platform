import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'رجوع',
  tone = 'danger',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
        >
          {busy ? <Spinner className="size-4" /> : null}
          {confirmLabel}
        </button>
      </div>
    }
  >
    <div className="text-sm leading-7 text-slate-600">{description}</div>
  </Modal>
);
