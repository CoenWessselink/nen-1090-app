import { Bell, Command, LogOut, Menu, Plus, Search } from 'lucide-react';
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
    openCommandPalette,
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
        <button className="icon-button mobile-only" onClick={toggleSidebar} aria-label="Menu openen">
          <Menu size={18} />
        </button>
        <div className="search-shell search-shell-with-results">
          <Search size={16} />
          <Input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Zoek in projecten, lassen, documenten en inspecties"
          />
          <SearchResultsPopover />
        </div>
        <div className="topbar-actions">
          <Button variant="secondary" onClick={openCommandPalette}>
            <Command size={16} />
            <span className="button-label-desktop">Command</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              navigate('/projecten');
              requestCreateProject();
              pushNotification({ title: 'Nieuw project', description: 'De projectwizard is geopend. Command en Nieuw zijn nu gescheiden acties.', tone: 'info' });
            }}
          >
            <Plus size={16} />
            <span className="button-label-desktop">Nieuw</span>
          </Button>
          <button className="icon-button has-badge" aria-label="Meldingen" onClick={toggleNotificationCenter}>
            <Bell size={18} />
            {unreadCount ? <span className="icon-badge">{unreadCount}</span> : null}
          </button>
          <div className="profile-pill">
            <strong>{session.user?.email || 'Niet ingelogd'}</strong>
            <span>{`${session.user?.tenant || 'tenant onbekend'} · ${session.user?.role || 'geen rol'}`}</span>
          </div>
          <button
            className="icon-button desktop-only"
            type="button"
            aria-label="Uitloggen"
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
