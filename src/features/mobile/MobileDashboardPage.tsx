import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, FileText, FolderKanban, FolderPlus, Settings, TriangleAlert, Wrench } from 'lucide-react';
import { getDashboardSummary } from '@/api/dashboard';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { PremiumActionCard, PremiumMetricCard } from '@/features/mobile/PremiumDashboard';
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
        setError(normalizeApiError(err, 'Dashboard kon niet worden geladen.'));
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

  const metricCards = useMemo(
    () => [
      {
        label: 'Actieve projecten',
        subtitle: 'Projecten in uitvoering',
        value: formatValue(summary?.active_projects || summary?.open_projects || 0, '0'),
        tone: 'danger' as const,
        icon: FolderKanban,
        to: '/projecten',
        visual: 'bars' as const,
      },
      {
        label: 'Open lassen',
        subtitle: 'Lassen die actie vereisen',
        value: formatValue(summary?.open_welds || 0, '0'),
        tone: 'warning' as const,
        icon: Wrench,
        to: '/projecten',
        visual: 'donut' as const,
      },
      {
        label: 'Niet-conforme lassen',
        subtitle: 'Afwijkingen die aandacht nodig hebben',
        value: formatValue(summary?.rejected_welds || 0, '0'),
        tone: 'primary' as const,
        icon: TriangleAlert,
        to: '/projecten',
        visual: 'shield' as const,
      },
      {
        label: 'Afgeronde inspecties',
        subtitle: 'Inspecties succesvol afgerond',
        value: formatValue(summary?.ce_dossier_ready || summary?.reports || 0, '0'),
        tone: 'success' as const,
        icon: FileCheck2,
        to: '/rapportage',
        visual: 'line' as const,
      },
    ],
    [summary],
  );

  const actionCards = useMemo(
    () => [
      {
        label: 'Rapportages',
        value: formatValue(summary?.reports || 0, '0'),
        subtitle: 'Beschikbare rapporten',
        icon: FileText,
        to: '/rapportage',
        tone: 'primary' as const,
        visual: 'line' as const,
      },
      {
        label: 'Instellingen',
        value: '›',
        subtitle: 'Stamdata en templates',
        icon: Settings,
        to: '/instellingen',
        tone: 'success' as const,
        visual: 'shield' as const,
      },
      {
        label: 'Nieuw project',
        value: '+',
        subtitle: 'Project aanmaken',
        icon: FolderPlus,
        to: '/projecten/nieuw',
        tone: 'danger' as const,
        visual: 'bars' as const,
      },
      {
        label: 'Las toevoegen',
        value: '+',
        subtitle: 'Kies een project',
        icon: Wrench,
        to: '/projecten',
        tone: 'warning' as const,
        visual: 'donut' as const,
      },
    ],
    [summary],
  );

  return (
    <div data-no-translate="true">
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
              {onboarding.title || 'Voorbeeldproject EN 1090 staat klaar'}
            </strong>
            <span style={{ display: 'block', color: '#475569', lineHeight: 1.35 }}>
              {onboarding.message || 'Open het voorbeeldproject om projecten, lassen, inspecties, compliance en PDF-export te bekijken.'}
            </span>
            {onboarding.project_code ? (
              <small style={{ display: 'block', color: '#64748b', marginTop: 8 }}>Project: {onboarding.project_code}</small>
            ) : null}
          </button>
        ) : null}
        {!loading && !error ? (
          <div className="premium-dashboard-stack">
            {metricCards.map((card) => (
              <PremiumMetricCard
                key={card.label}
                label={card.label}
                subtitle={card.subtitle}
                value={card.value}
                tone={card.tone}
                visual={card.visual}
                icon={card.icon}
                onClick={() => navigate(card.to)}
              />
            ))}
            <div className="premium-dashboard-actions">
              {actionCards.map((card) => (
                <PremiumActionCard
                  key={card.label}
                  label={card.label}
                  subtitle={card.subtitle}
                  value={card.value}
                  tone={card.tone}
                  visual={card.visual}
                  icon={card.icon}
                  onClick={() => navigate(card.to)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </MobilePageScaffold>
    </div>
  );
}
