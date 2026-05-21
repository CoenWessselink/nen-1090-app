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

type PremiumActionCardProps = PremiumMetricCardProps;

export function PremiumMetricCard({ label, subtitle, value, tone, visual, icon: Icon, onClick }: PremiumMetricCardProps) {
  return (
    <button type="button" className={`premium-dashboard-card premium-dashboard-card-${tone} premium-dashboard-card-${visual}`} onClick={onClick} data-no-translate="true">
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

export function PremiumActionCard(props: PremiumActionCardProps) {
  const { label, subtitle, value, tone, visual, icon: Icon, onClick } = props;
  return (
    <button type="button" className={`premium-dashboard-card premium-dashboard-action-card premium-dashboard-card-${tone} premium-dashboard-card-${visual}`} onClick={onClick} data-no-translate="true">
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
