import React from 'react';
import { useNavigate } from 'react-router-dom';

export type ProjectTabShellProps = {
  projectId: string;
  currentTab: string;
  children: React.ReactNode;
  onBack: () => void;
  onCreateProject: () => void | Promise<void>;
  onEditProject: () => void | Promise<void>;
  onCreateAssembly: () => void | Promise<void>;
  onCreateWeld: () => void | Promise<void>;
  filters?: React.ReactNode;
  kpis?: React.ReactNode;
};

type TabItem = { key: string; label: string; path: string };

function buildTabs(projectId: string): TabItem[] {
  return [
    { key: 'overzicht', label: 'Overzicht', path: `/projecten/${projectId}/overzicht` },
    { key: 'assemblies', label: 'Assemblies', path: `/projecten/${projectId}/assemblies` },
    { key: 'lassen', label: 'Lassen', path: `/projecten/${projectId}/lassen` },
    { key: 'lascontrole', label: 'Lascontrole', path: `/projecten/${projectId}/lascontrole` },
    { key: 'documenten', label: 'Documenten', path: `/projecten/${projectId}/documenten` },
    { key: 'ce-dossier', label: 'CE Dossier', path: `/projecten/${projectId}/ce-dossier` },
    { key: 'historie', label: 'Historie', path: `/projecten/${projectId}/historie` },
  ];
}

function cardStyle(): React.CSSProperties {
  return {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)',
  };
}

function actionButtonStyle(primary = false): React.CSSProperties {
  return {
    borderRadius: 12,
    border: primary ? '1px solid #2563eb' : '1px solid #cbd5e1',
    background: primary ? '#2563eb' : '#ffffff',
    color: primary ? '#ffffff' : '#0f172a',
    fontWeight: 600,
    fontSize: 14,
    minHeight: 44,
    padding: '10px 14px',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  };
}

export default function ProjectTabShell({
  projectId,
  currentTab,
  children,
  onBack,
  onCreateProject,
  onEditProject,
  onCreateAssembly,
  onCreateWeld,
  filters,
  kpis,
}: ProjectTabShellProps) {
  const navigate = useNavigate();
  const tabs = buildTabs(projectId);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={cardStyle()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Projectnavigatie
        </div>
        <h3 style={{ margin: '8px 0 0 0', color: '#0f172a' }}>
          Elke projectpagina gebruikt dezelfde vaste tabvolgorde
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
          Tabs bovenin, daarna actiebalk, filters, KPI’s en de werktafel.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          {tabs.map((tab) => {
            const active = tab.key === currentTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate(tab.path)}
                style={{
                  borderRadius: 999,
                  border: active ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  background: active ? '#eff6ff' : '#ffffff',
                  color: active ? '#2563eb' : '#0f172a',
                  fontWeight: 600,
                  minHeight: 42,
                  padding: '10px 16px',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <section style={cardStyle()}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Uniforme bedieningslaag
        </div>
        <h3 style={{ margin: '8px 0 0 0', color: '#0f172a' }}>
          Vaste hoofdacties op alle Project 360-tabbladen
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>
          De knopvolgorde en uitlijning blijven op elk tabblad identiek zodat de projectflow overal hetzelfde aanvoelt.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          <button type="button" style={actionButtonStyle()} onClick={onBack}>← Terug naar projecten</button>
          <button type="button" style={actionButtonStyle()} onClick={() => void onCreateProject()}>Nieuw project</button>
          <button type="button" style={actionButtonStyle()} onClick={() => void onEditProject()}>Wijzig project</button>
          <button type="button" style={actionButtonStyle()} onClick={() => void onCreateAssembly()}>Nieuwe assembly</button>
          <button type="button" style={actionButtonStyle()} onClick={() => void onCreateWeld()}>Nieuwe las</button>
          <button type="button" style={actionButtonStyle(true)}>PDF export</button>
        </div>
      </section>

      {filters ? <section style={cardStyle()}>{filters}</section> : null}
      {kpis ? <section style={cardStyle()}>{kpis}</section> : null}
      <section style={cardStyle()}>{children}</section>
    </div>
  );
}
