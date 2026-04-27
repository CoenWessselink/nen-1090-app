import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'nen1090.activeProject';

type ActiveProject = {
  id: string;
  name?: string;
  projectnummer?: string;
};

type ProjectContextValue = {
  activeProject: ActiveProject | null;
  projectId: string;
  projectLabel: string;
  hasProject: boolean;
  setProject: (project: ActiveProject | null) => void;
  clearProject: () => void;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

function normalizeProjectId(value: unknown): string {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  if (!decoded || decoded === '{id}' || /%7bid%7d/i.test(raw)) return '';
  if (/[{}]/.test(decoded)) return '';
  return decoded;
}

function normalizeProject(project: ActiveProject | null): ActiveProject | null {
  if (!project) return null;
  const id = normalizeProjectId(project.id);
  if (!id) return null;
  return {
    id,
    name: project.name,
    projectnummer: project.projectnummer,
  };
}

function readInitialProject(): ActiveProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveProject;
    return normalizeProject(parsed);
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: PropsWithChildren) {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(() => readInitialProject());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!activeProject) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeProject));
  }, [activeProject]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      activeProject,
      projectId: activeProject?.id ? String(activeProject.id) : '',
      projectLabel: activeProject?.projectnummer || activeProject?.name || activeProject?.id || 'Geen project geselecteerd',
      hasProject: Boolean(activeProject?.id),
      setProject: (project) => setActiveProject(normalizeProject(project)),
      clearProject: () => setActiveProject(null),
    }),
    [activeProject],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjectContext must be used inside ProjectProvider');
  return context;
}
