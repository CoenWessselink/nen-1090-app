import { NavLink, useLocation } from 'react-router-dom';
import { useSession } from '@/app/session/SessionContext';
import { Menu, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { appRouteMeta } from '@/app/router/routes';
import './site-navbar.css';

const PRODUCTION_MARKETING_BASE = 'https://weldinspectpro.com';

function normalizeMarketingBase(value: string | undefined): string {
  const configured = String(value || '').trim().replace(/\/+$/, '');
  if (!configured) return PRODUCTION_MARKETING_BASE;

  try {
    const parsed = new URL(configured);
    const host = parsed.hostname.toLowerCase();
    if (host === 'weldinspectpro.com' || host === 'www.weldinspectpro.com') {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    return PRODUCTION_MARKETING_BASE;
  }

  return PRODUCTION_MARKETING_BASE;
}

const marketingBase = normalizeMarketingBase(import.meta.env.VITE_MARKETING_BASE_URL);

const marketingLinks = [
  { href: `${marketingBase}/platform.html`, label: 'Platform' },
  { href: `${marketingBase}/use-cases.html`, label: 'Oplossingen' },
  { href: `${marketingBase}/standards.html`, label: 'Normen' },
  { href: `${marketingBase}/resources.html`, label: 'Resources' },
  { href: `${marketingBase}/#footer`, label: 'Over ons' },
];

function NavbarApp() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const session = useSession();

  const appLinks = appRouteMeta
    .filter((item) => item.showInSidebar && (!item.roles || session.hasRole(item.roles)))
    .map((item) => ({ path: item.path, label: item.label }));

  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <NavLink className="site-navbar-brand" to="/dashboard">
          <span className="site-navbar-mark">W</span>
          <span className="site-navbar-brandtext">
            <strong>WELDINSPECT <em>PRO</em></strong>
            <small>GLOBAL WELDING COMPLIANCE</small>
          </span>
        </NavLink>

        <nav className="site-navbar-links">
          {appLinks.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `site-navbar-link${isActive || location.pathname.startsWith(item.path) ? ' is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="site-navbar-actions">
          <span className="site-navbar-user">{session.user?.email || ''}</span>
          <NavLink to="/logout" className="site-navbar-btn site-navbar-btn-ghost">
            Uitloggen
          </NavLink>
        </div>

        <button
          className="site-navbar-mobile-toggle"
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="site-navbar-mobile">
          {appLinks.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/logout" className="site-navbar-btn site-navbar-btn-ghost" onClick={() => setMobileOpen(false)}>
            Uitloggen
          </NavLink>
        </nav>
      )}
    </header>
  );
}

function NavbarPublic() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = useMemo(() => () => setMobileOpen(false), []);

  return (
    <header className="site-navbar site-navbar-public">
      <div className="site-navbar-inner">
        <a className="site-navbar-brand" href={`${marketingBase}/`} aria-label="WeldInspect Pro home">
          <span className="site-navbar-mark">W</span>
          <span className="site-navbar-brandtext">
            <strong>WELDINSPECT <em>PRO</em></strong>
            <small>GLOBAL WELDING COMPLIANCE</small>
          </span>
        </a>

        <nav className="site-navbar-links" aria-label="Marketing navigatie">
          {marketingLinks.map((item) => (
            <a key={item.href} className="site-navbar-link" href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="site-navbar-actions">
          <NavLink to="/login" className="site-navbar-btn site-navbar-btn-ghost">
            Inloggen
          </NavLink>
          <a className="site-navbar-btn site-navbar-btn-primary" href={`${marketingBase}/demo.html`}>
            Book a Demo
          </a>
        </div>

        <button
          className="site-navbar-mobile-toggle"
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Sluit menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="site-navbar-mobile" aria-label="Mobiele marketing navigatie">
          {marketingLinks.map((item) => (
            <a key={item.href} href={item.href} onClick={closeMobileMenu}>{item.label}</a>
          ))}
          <NavLink to="/login" className="site-navbar-btn site-navbar-btn-ghost" onClick={closeMobileMenu}>
            Inloggen
          </NavLink>
          <a className="site-navbar-btn site-navbar-btn-primary" href={`${marketingBase}/demo.html`} onClick={closeMobileMenu}>
            Book a Demo
          </a>
        </nav>
      )}
    </header>
  );
}

export function SiteNavbar({ variant = 'app' }: { variant?: 'app' | 'public' }) {
  if (variant === 'public') return <NavbarPublic />;
  return <NavbarApp />;
}
