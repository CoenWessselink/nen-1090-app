import { BarChart3, FileBadge, FolderKanban, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projecten', label: 'Projecten', icon: FolderKanban },
  { to: '/lascontrole', label: 'Lascontrole', icon: ShieldCheck },
  { to: '/ce-dossier', label: 'CE', icon: FileBadge },
  { to: '/rapportage', label: 'Rapportage', icon: BarChart3 },
];

export function MobileTabbar() {
  return (
    <nav className="mobile-tabbar">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('mobile-tab', isActive && 'mobile-tab-active')}>
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
