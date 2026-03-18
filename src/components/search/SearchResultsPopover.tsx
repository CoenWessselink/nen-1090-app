import { useMemo } from 'react';
import { FileText, FolderKanban, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appRouteMeta } from '@/app/router/routes';
import { useSession } from '@/app/session/SessionContext';
import { useUiStore } from '@/app/store/ui-store';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

function readLabel(row: Record<string, unknown>) {
  return String(row.name || row.title || row.weld_number || row.code || row.id || 'Resultaat');
}

function readSubtitle(group: string, row: Record<string, unknown>) {
  const status = row.status || row.project_name || row.type || row.result || '';
  return `${group}${status ? ` · ${String(status)}` : ''}`;
}

export function SearchResultsPopover() {
  const navigate = useNavigate();
  const session = useSession();
  const { globalSearch, setGlobalSearch } = useUiStore();
  const apiSearch = useGlobalSearch(globalSearch);

  const query = globalSearch.trim();
  const routeResults = useMemo(() => {
    if (query.length < 2) return [];
    const needle = query.toLowerCase();
    return appRouteMeta
      .filter((item) => !item.roles || session.hasRole(item.roles))
      .filter((item) => [item.label, item.description, ...(item.keywords || [])].join(' ').toLowerCase().includes(needle))
      .slice(0, 5)
      .map((item) => ({
        key: item.path,
        title: item.label,
        subtitle: item.description,
        icon: item.icon,
        onSelect: () => {
          navigate(item.path);
          setGlobalSearch('');
        },
      }));
  }, [navigate, query, session, setGlobalSearch]);

  const apiResults = useMemo(() => {
    const payload = apiSearch.data;
    if (!payload || query.length < 2) return [];

    const buckets = [
      { group: 'Projecten', rows: payload.projects || [], path: '/projecten', icon: FolderKanban },
      { group: 'Assemblies', rows: payload.assemblies || [], path: '/projecten', icon: FolderKanban },
      { group: 'Lassen', rows: payload.welds || [], path: '/lascontrole', icon: ShieldCheck },
      { group: 'Documenten', rows: payload.documents || [], path: '/ce-dossier', icon: FileText },
      { group: 'Inspecties', rows: payload.inspections || [], path: '/lascontrole', icon: Search },
    ];

    return buckets.flatMap((bucket) =>
      bucket.rows.slice(0, 2).map((row) => {
        const record = row as Record<string, unknown>;
        return {
          key: `${bucket.group}-${String(record.id || readLabel(record))}`,
          title: readLabel(record),
          subtitle: readSubtitle(bucket.group, record),
          icon: bucket.icon,
          onSelect: () => {
            navigate(bucket.path);
            setGlobalSearch('');
          },
        };
      }),
    );
  }, [apiSearch.data, navigate, query, setGlobalSearch]);

  const results = [...routeResults, ...apiResults].slice(0, 8);

  if (query.length < 2) return null;

  return (
    <div className="search-popover" role="listbox" aria-label="Globale zoekresultaten">
      {apiSearch.isFetching ? <div className="search-popover-empty">Zoekresultaten laden…</div> : null}
      {!apiSearch.isFetching && results.length === 0 ? <div className="search-popover-empty">Geen resultaten gevonden.</div> : null}
      {results.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.key} type="button" className="search-popover-item" onClick={item.onSelect}>
            <span className="search-popover-icon">{Icon ? <Icon size={16} /> : <Search size={16} />}</span>
            <span className="search-popover-copy">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
