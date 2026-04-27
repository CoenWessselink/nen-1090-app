import { Bell } from 'lucide-react';
import { useUiStore } from '@/app/store/ui-store';
import { formatDateTime } from '@/utils/format';

export function NotificationCenter() {
  const { notificationCenterOpen, notifications, closeNotificationCenter, markNotificationRead } = useUiStore();

  if (!notificationCenterOpen) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onClick={closeNotificationCenter}>
      <aside className="notification-center" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>Meldingen</h3>
            <p>Workflow- en systeemmeldingen voor de frontend.</p>
          </div>
        </div>

        <div className="notification-list">
          {notifications.map((item) => (
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
          ))}
        </div>
      </aside>
    </div>
  );
}
