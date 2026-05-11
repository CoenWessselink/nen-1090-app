import React, { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

interface EnterpriseModalProps extends PropsWithChildren {
  title: string;
  open: boolean;
  onClose: () => void;
}

export default function EnterpriseModal({
  title,
  open,
  onClose,
  children,
}: EnterpriseModalProps) {
  if (!open) {
    return null;
  }

  return createPortal(
    <div className="enterprise-modal-overlay">
      <div className="enterprise-modal">
        <div className="enterprise-modal-header">
          <h2>{title}</h2>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="enterprise-modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
