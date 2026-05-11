import { Bell, LogOut, Menu, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/app/store/ui-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/app/session/SessionContext';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { SearchResultsPopover } from '@/components/search/SearchResultsPopover';

export function Topbar() {
  const navigate = useNavigate();

  const {
    globalSearch,
    setGlobalSearch,
    toggleSidebar,
    toggleNotificationCenter,
    notifications,
    pushNotification,
    requestCreateProject,
  } = useUiStore();

  const session = useSession();
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <header className="topbar-shell">
      <div className="topbar topbar-main">
        <button className="icon-button mobile-only" onClick={toggleSidebar} aria-label="Open navigation">
          <Menu size={18} />
        </button>

        <div className="search-shell search-shell-with-results">
          <Search size={16} />
          <Input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Search projects, welds, CE dossiers and inspections"
          />
          <SearchResultsPopover />
        </div>

        <div className="topbar-actions">
          <Button
            variant="secondary"
            onClick={() => {
              navigate('/projecten');
              requestCreateProject();
              pushNotification({
                title: 'New Project',
                description: 'Enterprise project wizard opened.',
                tone: 'info',
              });
            }}
          >
            <Plus size={16} />
            <span className="button-label-desktop">New</span>
          </Button>

          <button className="icon-button has-badge" aria-label="Notifications" onClick={toggleNotificationCenter}>
            <Bell size={18} />
            {unreadCount ? <span className="icon-badge">{unreadCount}</span> : null}
          </button>

          <div className="profile-pill">
            <strong>{session.user?.email || 'Not logged in'}</strong>
            <span>{`${session.user?.tenant || 'unknown tenant'} · ${session.user?.role || 'no role'}`}</span>
          </div>

          <button
            className="icon-button desktop-only"
            type="button"
            aria-label="Logout"
            onClick={() => {
              navigate('/logout');
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="topbar-breadcrumb-row">
        <Breadcrumbs />
      </div>
    </header>
  );
}
