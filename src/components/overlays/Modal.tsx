import { PropsWithChildren } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, size = 'medium', children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; size?: 'small' | 'medium' | 'large' | 'fullscreen' }>) {
  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`modal-panel modal-${size}`} onClick={(event) => event.stopPropagation()}>
        <div className="overlay-header">
          <div>
            <h3>{title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}
