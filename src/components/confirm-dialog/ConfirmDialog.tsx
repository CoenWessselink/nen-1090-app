import { Modal } from '@/components/overlays/Modal';
import { Button } from '@/components/ui/Button';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Bevestigen',
  cancelLabel = 'Annuleren',
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="small">
      <div className="confirm-dialog-copy">
        <p>{description}</p>
        <div className="toolbar-cluster">
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
