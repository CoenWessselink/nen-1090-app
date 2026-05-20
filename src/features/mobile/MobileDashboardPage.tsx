import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, FileText, FolderKanban, FolderPlus, Settings, TriangleAlert, Wrench } from 'lucide-react';
import { getDashboardSummary } from '@/api/dashboard';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { APP_REFRESH_EVENT, formatValue, normalizeApiError } from '@/features/mobile/mobile-utils';
import type { DashboardSummary } from '@/types/domain';

type DashboardOnboarding = {
  show_example_project_hint?: boolean;
  title?: string;
  message?: string;
  project_code?: string | null;
};

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

  const onboarding = (summary?.onboarding || {}) as DashboardOnboarding;
  const showExampleHint = Boolean(onboarding.show_example_project_hint || summary?.example_project_available);

  const cards = useMemo(
    () => [
      {
        label: 'Actieve projecten',
        subtitle: 'Projecten in uitvoering',
        value: formatValue(summary?.active_projects || summary?.open_projects || 0, '0'),
        tone: 'danger',
        icon: FolderKanban,
        to: '/projecten',
        visual: 'bars',
      },
      {
        label: 'Open lassen',
        subtitle: 'Lassen die actie vereisen',
        value: formatValue(summary?.open_welds || 0, '0'),
        tone: 'warning',
        icon: Wrench,
        to: '/projecten',
        visual: 'donut',
      },
      {
        label: 'Niet-conforme lassen',
        subtitle: 'Afwijkingen die aandacht nodig hebben',
        value: formatValue(summary?.rejected_welds || 0, '0'),
        tone: 'primary',
        icon: TriangleAlert,
        to: '/projecten',
        visual: 'shield',
      },
      {
        label: 'Afgeronde inspecties',
        subtitle: 'Inspecties succesvol afgerond',
        value: formatValue(summary?.ce_dossier_ready || summary?.reports || 0, '0'),
        tone: 'success',
        icon: FileCheck2,
        to: '/rapportage',
        visual: 'line',
      },
      { label: 'Rapportages', value: formatValue(summary?.reports || 0, '0'), subtitle: 'Beschikbare rapporten', tone: 'secondary', icon: FileText, to: '/rapportage', compact: true },
      { label: 'Instellingen', value: '', subtitle: 'Stamdata & templates', tone: 'secondary', icon: Settings, to: '/instellingen', compact: true },
      { label: 'Project aanmaken', value: '', subtitle: 'Nieuw project', tone: 'secondary', icon: FolderPlus, to: '/projecten/nieuw', compact: true },
      { label: 'Las toevoegen', value: '', subtitle: 'Kies een project', tone: 'secondary', icon: Wrench, to: '/projecten', compact: true },
    ],
    [summary],
  );

  return (
    <MobilePageScaffold title="Dashboard" subtitle="Overzicht">
      {loading ? <div className="mobile-state-card">Dashboard laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {refreshing && !loading ? <div className="mobile-list-card-meta" style={{ marginBottom: 8 }}>Dashboard vernieuwen…</div> : null}
      {!loading && !error && showExampleHint ? (
        <button
          type="button"
          className="mobile-state-card"
          style={{ textAlign: 'left', marginBottom: 14, borderColor: '#c7d8ff', background: '#eef4ff' }}
          onClick={() => navigate('/projecten')}
        >
          <strong style={{ display: 'block', color: '#2547a8', marginBottom: 6 }}>
            {onboarding.title || 'Example EN 1090 project is ready'}
          </strong>
          <span style={{ display: 'block', color: '#475569', lineHeight: 1.35 }}>
            {onboarding.message || 'Open the example project to explore projects, welds, inspections, compliance and PDF export.'}
          </span>
          {onboarding.project_code ? (
            <small style={{ display: 'block', color: '#64748b', marginTop: 8 }}>Project: {onboarding.project_code}</small>
          ) : null}
        </button>
      ) : null}
      {!loading && !error ? (
        <div className="mobile-kpi-grid mobile-dashboard-premium-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                className={`mobile-kpi-card mobile-kpi-card-${card.tone} ${card.compact ? 'mobile-kpi-card-action' : ''} ${card.visual ? `mobile-kpi-visual-${card.visual}` : ''}`}
                onClick={() => navigate(card.to)}
              >
                {!card.compact ? <span className="mobile-kpi-more" aria-hidden="true">•••</span> : null}
                <div className="mobile-kpi-top"><Icon size={18} /><span>{card.label}</span></div>
                {card.subtitle ? <span className="mobile-kpi-subtitle" translate="no">{card.subtitle}</span> : null}
                <strong>{card.value}</strong>
              </button>
            );
          })}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
