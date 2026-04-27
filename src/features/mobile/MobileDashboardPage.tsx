import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, FileText, FolderKanban, FolderPlus, Settings, TriangleAlert, Wrench } from 'lucide-react';
import { getDashboardSummary } from '@/api/dashboard';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, formatValue, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { DashboardSummary } from '@/types/domain';

export function MobileDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback((background = false) => {
    let active = true;
    if (background) setRefreshing(true);
    else setLoading(true);
    getDashboardSummary()
      .then((result) => {
        if (!active) return;
        setSummary(result || {});
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(normalizeApiError(err, 'Dashboard could not be loaded.'));
      })
      .finally(() => {
        if (!active) return;
        if (background) setRefreshing(false);
        else setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadSummary(false), [loadSummary]);

  useEffect(() => {
    const reload = () => loadSummary(true);
    window.addEventListener(APP_REFRESH_EVENT, reload as EventListener);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, reload as EventListener);
    };
  }, [loadSummary]);

  const cards = useMemo(
    () => [
      { label: 'Active projects', value: formatValue(summary?.open_projects || summary?.active_projects || 0, '0'), tone: 'danger', icon: FolderKanban, to: '/projecten' },
      { label: 'Open weld work', value: formatValue(summary?.open_welds || summary?.open_weld_defects || 0, '0'), tone: 'warning', icon: Wrench, to: '/projecten' },
      { label: 'Non-compliant welds', value: formatValue(summary?.rejected_welds || summary?.open_weld_defects || 0, '0'), tone: 'primary', icon: TriangleAlert, to: '/projecten' },
      { label: 'Dossiers pending review', value: formatValue(summary?.pending_dossiers || summary?.ce_dossier_ready || 0, '0'), tone: 'success', icon: FileCheck2, to: '/rapportage' },
      { label: 'Reports', value: formatValue(summary?.pending_dossiers || summary?.ce_dossier_ready || 0, '0'), subtitle: 'Current reports', tone: 'secondary', icon: FileText, to: '/rapportage', compact: true },
      { label: 'Settings', value: formatValue(summary?.open_projects || summary?.active_projects || 0, '0'), subtitle: 'Master data & templates', tone: 'secondary', icon: Settings, to: '/instellingen', compact: true },
      { label: 'Create project', value: formatValue(summary?.active_projects || 0, '0'), subtitle: 'Add project', tone: 'secondary', icon: FolderPlus, to: '/projecten/nieuw', compact: true },
      { label: 'Create weld', value: formatValue(summary?.open_welds || summary?.open_weld_defects || 0, '0'), subtitle: 'Select a project', tone: 'secondary', icon: Wrench, to: '/projecten', compact: true },
    ],
    [summary],
  );

  return (
    <MobilePageScaffold title="Dashboard" subtitle="Mobile overview">
      {loading ? <div className="mobile-state-card">Loading dashboard…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {refreshing && !loading ? <div className="mobile-list-card-meta" style={{ marginBottom: 8 }}>Updating dashboard…</div> : null}
      {!loading && !error ? (
        <div className="mobile-kpi-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                className={`mobile-kpi-card mobile-kpi-card-${card.tone} ${card.compact ? 'mobile-kpi-card-action' : ''}`}
                onClick={() => navigate(card.to)}
              >
                <div className="mobile-kpi-top"><Icon size={18} /><span>{card.label}</span></div>
                <strong>{card.value}</strong>{card.compact ? <small style={{ color: 'rgba(255,255,255,0.82)' }}>{card.subtitle}</small> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
