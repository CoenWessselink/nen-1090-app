import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

type PremiumMetricTone = 'danger' | 'warning' | 'primary' | 'success';
type PremiumMetricVisual = 'bars' | 'donut' | 'shield' | 'line';

type PremiumMetricCardProps = {
  label: string;
  subtitle: string;
  value: string;
  tone: PremiumMetricTone;
  visual: PremiumMetricVisual;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
};

type PremiumActionCardProps = {
  label: string;
  subtitle: string;
  value?: string;
  icon: ComponentType<LucideProps>;
  onClick: () => void;
};

export function PremiumMetricCard({ label, subtitle, value, tone, visual, icon: Icon, onClick }: PremiumMetricCardProps) {
  return (
    <button
      type="button"
      className={`premium-dashboard-card premium-dashboard-card-${tone} premium-dashboard-card-${visual}`}
      onClick={onClick}
      data-no-translate="true"
    >
      <span className="premium-dashboard-more" aria-hidden="true">•••</span>
      <span className="premium-dashboard-icon" aria-hidden="true"><Icon size={30} /></span>
      <span className="premium-dashboard-copy">
        <span className="premium-dashboard-title">{label}</span>
        <span className="premium-dashboard-subtitle">{subtitle}</span>
        <strong className="premium-dashboard-value">{value}</strong>
      </span>
      <span className="premium-dashboard-visual" aria-hidden="true" />
    </button>
  );
}

export function PremiumActionCard({ label, subtitle, value, icon: Icon, onClick }: PremiumActionCardProps) {
  return (
    <button type="button" className="premium-dashboard-action-card" onClick={onClick} data-no-translate="true">
      <span className="premium-dashboard-action-icon" aria-hidden="true"><Icon size={26} /></span>
      <span className="premium-dashboard-action-copy">
        <span className="premium-dashboard-action-title">{label}</span>
        <span className="premium-dashboard-action-subtitle">{subtitle}</span>
        {value ? <strong className="premium-dashboard-action-value">{value}</strong> : null}
      </span>
    </button>
  );
}
