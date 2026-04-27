import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { appRouteMeta } from '@/app/router/routes';

function labelForPath(pathname: string) {
  return appRouteMeta.find((item) => item.path === pathname)?.label;
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    return {
      href,
      label: labelForPath(href) || segment.replace(/-/g, ' '),
      active: index === segments.length - 1,
    };
  });

  return (
    <nav className="breadcrumbs" aria-label="Broodkruimelpad">
      <Link to="/dashboard">Start</Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="breadcrumb-item">
          <ChevronRight size={14} />
          {crumb.active ? <strong>{crumb.label}</strong> : <Link to={crumb.href}>{crumb.label}</Link>}
        </span>
      ))}
    </nav>
  );
}
