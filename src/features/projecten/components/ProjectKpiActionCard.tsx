import type { ReactNode } from 'react';

type ProjectKpiActionCardProps = {
  label: string;
  value: string | number;
  meta: string;
  onClick: () => void;
  icon?: ReactNode;
  testId?: string;
};

export function ProjectKpiActionCard({ label, value, meta, onClick, icon, testId }: ProjectKpiActionCardProps) {
  return (
    <button
      type="button"
      className="card project-kpi-card project-kpi-card-button"
      onClick={onClick}
      data-testid={testId}
    >
      <div className="stat-card">
        <div className="project-kpi-card-header">
          <div className="stat-label">{label}</div>
          {icon ? <div className="project-kpi-card-icon">{icon}</div> : null}
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-meta">{meta}</div>
      </div>
    </button>
  );
}
