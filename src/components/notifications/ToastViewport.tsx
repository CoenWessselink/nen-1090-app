import { useEffect } from 'react';
import { useUiStore } from '@/app/store/ui-store';

export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 3500));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [dismissToast, toasts]);

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.tone || 'info'}`}>
          <strong>{toast.title}</strong>
          {toast.description ? <span>{toast.description}</span> : null}
        </div>
      ))}
    </div>
  );
}
