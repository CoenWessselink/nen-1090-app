import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, FileCheck2, TriangleAlert, Wrench } from 'lucide-react';
import { getDashboardSummary } from '@/api/dashboard';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { formatValue } from '@/features/mobile/mobile-utils';
import type { DashboardSummary } from '@/types/domain';

export function MobileDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDashboardSummary()
      .then((result) => {
        if (!active) return;
        setSummary(result || {});
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Dashboard kon niet worden geladen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      { label: 'Actieve Projecten', value: formatValue(summary?.open_projects || summary?.active_projects || 0, '0'), tone: 'danger', icon: FolderKanban },
      { label: 'Openstaand Laswerk', value: formatValue(summary?.open_welds || summary?.open_weld_defects || 0, '0'), tone: 'warning', icon: Wrench },
      { label: 'Afgekeurde Lassen', value: formatValue(summary?.rejected_welds || summary?.open_weld_defects || 0, '0'), tone: 'primary', icon: TriangleAlert },
      { label: 'Te Valideren Dossiers', value: formatValue(summary?.pending_dossiers || summary?.ce_dossier_ready || 0, '0'), tone: 'success', icon: FileCheck2 },
    ],
    [summary],
  );

  return (
    <MobilePageScaffold title="Dashboard" subtitle="Mobiel overzicht">
      {loading ? <div className="mobile-state-card">Dashboard laden…</div> : null}
      {error ? <div className="mobile-state-card mobile-state-card-error">{error}</div> : null}
      {!loading && !error ? (
        <div className="mobile-kpi-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                className={`mobile-kpi-card mobile-kpi-card-${card.tone}`}
                onClick={() => navigate('/projecten')}
              >
                <div className="mobile-kpi-top"><Icon size={18} /><span>{card.label}</span></div>
                <strong>{card.value}</strong>
              </button>
            );
          })}
        </div>
      ) : null}
    </MobilePageScaffold>
  );
}
