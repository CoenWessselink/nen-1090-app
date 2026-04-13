import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useProjectContext } from '@/context/ProjectContext';

function normalizeProjectId(value: string | undefined) {
  if (!value) return '';
  try {
    const decoded = decodeURIComponent(value).trim();
    if (!decoded || decoded === '{id}' || /[{}]/.test(decoded)) return '';
    return decoded;
  } catch {
    const fallback = String(value).trim();
    if (!fallback || fallback === '{id}' || /[{}]/.test(fallback)) return '';
    return fallback;
  }
}

function inferTarget(pathname: string, projectId: string) {
  if (pathname.endsWith('/welds') || pathname.includes('/lascontrole')) return `/projecten/${projectId}/lassen`;
  if (pathname.endsWith('/ce-dossier') || pathname.includes('/documents') || pathname.includes('/exports')) return `/projecten/${projectId}/ce-dossier`;
  return `/projecten/${projectId}`;
}

export function ProjectScopedRoute() {
  const { projectId: rawRouteProjectId } = useParams();
  const location = useLocation();
  const { activeProject, hasProject, setProject } = useProjectContext();
  const routeProjectId = normalizeProjectId(rawRouteProjectId);
  const activeProjectId = normalizeProjectId(String(activeProject?.id || ''));

  useEffect(() => {
    if (!routeProjectId) return;
    if (activeProjectId === routeProjectId) return;
    setProject({
      id: routeProjectId,
      name: activeProject?.name,
      projectnummer: activeProject?.projectnummer,
    });
  }, [activeProject?.name, activeProject?.projectnummer, activeProjectId, routeProjectId, setProject]);

  if (!routeProjectId) {
    if (hasProject && activeProjectId) {
      return <Navigate to={inferTarget(location.pathname, activeProjectId)} replace />;
    }
    return <Navigate to="/projecten" replace />;
  }

  return <Outlet />;
}
