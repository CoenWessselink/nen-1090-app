import { PropsWithChildren, useEffect, useRef, useState } from 'react';
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

type DragState = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

export function Modal({ open, onClose, title, size = 'medium', children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; size?: ModalSize }>) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 });
      dragStateRef.current = null;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || size === 'fullscreen') return;

    const getBounds = () => {
      if (typeof window === 'undefined') return { x: 0, y: 0 };
      const panelWidth = panelRef.current?.offsetWidth || modalWidths[size];
      const panelHeight = panelRef.current?.offsetHeight || Math.min(window.innerHeight - 48, 720);
      return {
        x: Math.max(0, Math.floor((window.innerWidth - panelWidth) / 2) - 24),
        y: Math.max(0, Math.floor((window.innerHeight - panelHeight) / 2) - 24),
      };
    };

    const stopDragging = () => {
      dragStateRef.current = null;
      document.body.classList.remove('modal-dragging');
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state?.active || state.pointerId !== event.pointerId) return;
      event.preventDefault();
      const bounds = getBounds();
      const nextX = state.originX + (event.clientX - state.startX);
      const nextY = state.originY + (event.clientY - state.startY);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(() => {
        setOffset({
          x: clamp(nextX, -bounds.x, bounds.x),
          y: clamp(nextY, -bounds.y, bounds.y),
        });
      });
    };

    const handleResize = () => {
      const bounds = getBounds();
      setOffset((current) => ({
        x: clamp(current.x, -bounds.x, bounds.x),
        y: clamp(current.y, -bounds.y, bounds.y),
      }));
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    window.addEventListener('blur', stopDragging);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      window.removeEventListener('blur', stopDragging);
      window.removeEventListener('resize', handleResize);
      stopDragging();
    };
  }, [open, size]);

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
          ref={headerRef}
          className={`overlay-header ${size === 'fullscreen' ? '' : 'overlay-header-draggable'}`.trim()}
          onPointerDown={(event) => {
            if (size === 'fullscreen') return;
            if ((event.target as HTMLElement).closest('button, input, select, textarea, a, [role="button"]')) return;
            dragStateRef.current = {
              active: true,
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              originX: offset.x,
              originY: offset.y,
            };
            headerRef.current?.setPointerCapture?.(event.pointerId);
            document.body.classList.add('modal-dragging');
            event.preventDefault();
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
