import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';

export const projectContextTabs = [
  { value: 'overzicht', label: 'Overzicht' },
  { value: 'assemblies', label: 'Assemblies' },
  { value: 'lassen', label: 'Lassen' },
  { value: 'lascontrole', label: 'Lascontrole' },
  { value: 'documenten', label: 'Documenten' },
  { value: 'ce-dossier', label: 'CE Dossier' },
  { value: 'historie', label: 'Historie' },
];

export function resolveProjectContextTab(pathname: string) {
  if (pathname.endsWith('/assemblies') || pathname.includes('/assemblies/')) return 'assemblies';
  if (pathname.endsWith('/lassen') || pathname.includes('/lassen/')) return 'lassen';
  if (pathname.endsWith('/lascontrole')) return 'lascontrole';
  if (pathname.endsWith('/documenten')) return 'documenten';
  if (pathname.endsWith('/ce-dossier')) return 'ce-dossier';
  if (pathname.endsWith('/historie')) return 'historie';
  return 'overzicht';
}

export function ProjectContextTabs({ projectId, value, searchSlot }: { projectId: string; value: string; searchSlot?: ReactNode }) {
  const navigate = useNavigate();

  return (
    <Card className="project-context-tabs-card">
      <div className="project-context-tabs-header">
        <div>
          <strong>Projectnavigatie</strong>
          <div className="list-subtle">De hoofdtabs blijven altijd zichtbaar binnen deze projectcontext.</div>
        </div>
        {searchSlot ? <div className="project-context-tabs-search">{searchSlot}</div> : null}
      </div>
      <Tabs
        tabs={projectContextTabs}
        value={value}
        onChange={(next) => navigate(`/projecten/${projectId}/${next}`)}
      />
    </Card>
  );
}
