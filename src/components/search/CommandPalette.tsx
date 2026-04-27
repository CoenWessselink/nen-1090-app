import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appRouteMeta } from '@/app/router/routes';
import { useSession } from '@/app/session/SessionContext';
import { useUiStore } from '@/app/store/ui-store';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

export function CommandPalette() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const { commandPaletteOpen, closeCommandPalette, globalSearch, setGlobalSearch } = useUiStore();
  const apiSearch = useGlobalSearch(globalSearch);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useUiStore.getState().setCommandPaletteOpen(true);
      }
      if (event.key === 'Escape') {
        useUiStore.getState().closeCommandPalette();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const routeResults = useMemo(() => {
    const needle = globalSearch.toLowerCase().trim();
    return appRouteMeta
      .filter((item) => !item.roles || session.hasRole(item.roles))
      .filter((item) => {
        if (!needle) return true;
        return [item.label, item.description, ...(item.keywords || [])].join(' ').toLowerCase().includes(needle);
      })
      .map((item) => ({
        key: item.path,
        title: item.label,
        subtitle: item.description,
        group: 'Pagina’s',
        onSelect: () => navigate(item.path),
        active: location.pathname === item.path,
        icon: item.icon,
      }));
  }, [globalSearch, location.pathname, navigate, session]);

  const apiResults = useMemo(() => {
    const payload = apiSearch.data;
    if (!payload) return [];

    const groups = [
      ['Projecten', payload.projects, '/projecten'],
      ['Assemblies', payload.assemblies, '/projecten'],
      ['Lassen', payload.welds, '/projecten'],
      ['Documenten', payload.documents, '/ce-dossier'],
      ['Inspecties', payload.inspections, '/projecten'],
    ] as const;

    return groups.flatMap(([group, rows, path]) => (rows || []).slice(0, 4).map((row) => ({
      key: `${group}-${String(row.id)}`,
      title: String((row as Record<string, unknown>).name || (row as Record<string, unknown>).title || (row as Record<string, unknown>).weld_number || (row as Record<string, unknown>).code || row.id),
      subtitle: `${group} · ${String((row as Record<string, unknown>).status || (row as Record<string, unknown>).project_name || '')}`.trim(),
      group,
      onSelect: () => navigate(path),
      active: false,
      icon: undefined,
    })));
  }, [apiSearch.data, navigate]);

  const results = [...routeResults, ...apiResults];

  useEffect(() => {
    if (!commandPaletteOpen) return;
    setActiveIndex(0);
  }, [commandPaletteOpen, globalSearch]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="overlay-backdrop" role="presentation" onClick={closeCommandPalette}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (!results.length) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % results.length);
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => (current - 1 + results.length) % results.length);
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            results[activeIndex]?.onSelect();
            closeCommandPalette();
          }
        }}
      >
        <div className="command-header">
          <div className="command-search">
            <Search size={16} />
            <input
              autoFocus
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Zoek pagina's, projecten, lassen of documenten"
            />
          </div>
          <span className="command-hint">Ctrl/Cmd + K</span>
        </div>

        <div className="command-results">
          {results.length ? results.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`command-item ${item.active || activeIndex === index ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  item.onSelect();
                  closeCommandPalette();
                }}
              >
                <span className="command-icon">{Icon ? <Icon size={18} /> : <Search size={16} />}</span>
                <span className="command-copy">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                  <small className="list-subtle">{item.group}</small>
                </span>
              </button>
            );
          }) : <div className="command-empty">Geen resultaten voor deze zoekopdracht.</div>}
          {apiSearch.isFetching ? <div className="command-empty">Zoekresultaten uit de API worden geladen…</div> : null}
        </div>
      </div>
    </div>
  );
}
