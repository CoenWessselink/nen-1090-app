import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useProjectContext } from '@/context/ProjectContext';

function inferTarget(pathname: string, projectId: string) {
  if (pathname.endsWith('/welds') || pathname.includes('/lascontrole')) return `/projecten/${projectId}/welds`;
  if (pathname.endsWith('/ce-dossier') || pathname.includes('/documents') || pathname.includes('/exports')) return `/projecten/${projectId}/ce-dossier`;
  return `/projecten/${projectId}`;
}

export function ProjectScopedRoute() {
  const { projectId: routeProjectId } = useParams();
  const location = useLocation();
  const { activeProject, hasProject, setProject } = useProjectContext();

  useEffect(() => {
    if (!routeProjectId) return;
    if (String(activeProject?.id || '') === String(routeProjectId)) return;
    setProject({
      id: String(routeProjectId),
      name: activeProject?.name,
      projectnummer: activeProject?.projectnummer,
    });
  }, [activeProject?.id, activeProject?.name, activeProject?.projectnummer, routeProjectId, setProject]);

  if (!routeProjectId) {
    if (hasProject && activeProject?.id) return <Navigate to={inferTarget(location.pathname, String(activeProject.id))} replace />;
    return <Navigate to="/projecten" replace />;
  }

  return <Outlet />;
}
