import { PropsWithChildren } from 'react';
import { X } from 'lucide-react';

export function Drawer({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!open) return null;

  return (
    <div className="overlay-backdrop overlay-backdrop-right" role="dialog" aria-modal="true" onClick={onClose}>
      <aside className="drawer-panel" onClick={(event) => event.stopPropagation()}>
        <div className="overlay-header">
          <h3>{title}</h3>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Sluiten">
            <X size={16} />
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </aside>
    </div>
  );
}
