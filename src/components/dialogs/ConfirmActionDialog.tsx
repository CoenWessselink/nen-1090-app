import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog';

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      danger
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
