import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';

const modalWidths: Record<Exclude<ModalSize, 'fullscreen'>, number> = {
  small: 420,
  medium: 720,
  large: 980,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function Modal({ open, onClose, title, size = 'medium', children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; size?: ModalSize }>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 });
      dragStateRef.current = null;
    }
  }, [open]);

  const maxBounds = useMemo(() => {
    if (typeof window === 'undefined' || size === 'fullscreen') {
      return { x: 0, y: 0 };
    }
    const width = Math.min(window.innerWidth - 48, modalWidths[size]);
    const height = Math.min(window.innerHeight - 48, (panelRef.current?.offsetHeight || window.innerHeight - 48));
    return {
      x: Math.max(0, Math.floor((window.innerWidth - width) / 2) - 24),
      y: Math.max(0, Math.floor((window.innerHeight - height) / 2) - 24),
    };
  }, [size, open]);

  useEffect(() => {
    if (!open || size === 'fullscreen') return;

    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const nextX = state.originX + (event.clientX - state.startX);
      const nextY = state.originY + (event.clientY - state.startY);
      setOffset({ x: clamp(nextX, -maxBounds.x, maxBounds.x), y: clamp(nextY, -maxBounds.y, maxBounds.y) });
    };

    const stopDragging = (event?: PointerEvent) => {
      if (event && dragStateRef.current && dragStateRef.current.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      if (panelRef.current) {
        try { panelRef.current.releasePointerCapture(event?.pointerId || 0); } catch {}
      }
    };

    const handleResize = () => setOffset((current) => ({
      x: clamp(current.x, -maxBounds.x, maxBounds.x),
      y: clamp(current.y, -maxBounds.y, maxBounds.y),
    }));

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, size, maxBounds.x, maxBounds.y]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        ref={panelRef}
        className={`modal-panel modal-${size}`}
        onClick={(event) => event.stopPropagation()}
        style={size === 'fullscreen' ? undefined : { transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className={`overlay-header ${size === 'fullscreen' ? '' : 'overlay-header-draggable'}`.trim()}
          onPointerDown={(event) => {
            if (size === 'fullscreen') return;
            if ((event.target as HTMLElement).closest('button, input, select, textarea, a, [role="button"]')) return;
            dragStateRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: offset.x,
              originY: offset.y,
            };
            try { panelRef.current?.setPointerCapture(event.pointerId); } catch {}
          }}
        >
          <div>
            <h3>{title}</h3>
            {size !== 'fullscreen' ? <div className="list-subtle">Versleep dit venster via de kopregel.</div> : null}
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
