import { Bell, X } from 'lucide-react';
import { useUiStore } from '@/app/store/ui-store';
import { formatDateTime } from '@/utils/format';

export function NotificationCenter() {
  const { notificationCenterOpen, notifications, closeNotificationCenter, markNotificationRead } = useUiStore();

  if (!notificationCenterOpen) return null;

  return (
    <div className="overlay-backdrop notification-overlay-backdrop" role="presentation" onClick={closeNotificationCenter}>
      <aside className="notification-center" role="dialog" aria-modal="true" aria-label="Meldingen" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head notification-drawer-head">
          <div>
            <h3>Meldingen</h3>
            <p>Workflow- en systeemmeldingen.</p>
          </div>
          <button type="button" className="notification-close-button" aria-label="Meldingen sluiten" onClick={closeNotificationCenter}>
            <X size={18} />
          </button>
        </div>

        <div className="notification-list">
          {notifications.length ? (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notification-item ${item.read ? 'read' : ''}`}
                onClick={() => markNotificationRead(item.id)}
              >
                <span className={`notification-dot ${item.tone || 'info'}`}>
                  <Bell size={14} />
                </span>
                <span className="notification-copy">
                  <strong>{item.title}</strong>
                  <span>{item.description || 'Geen aanvullende details.'}</span>
                  <small>{formatDateTime(item.createdAt)}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="notification-empty-state">
              <span className="notification-dot info" aria-hidden="true">
                <Bell size={14} />
              </span>
              <div>
                <strong>Geen meldingen</strong>
                <span>Er zijn op dit moment geen workflow- of systeemmeldingen.</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
