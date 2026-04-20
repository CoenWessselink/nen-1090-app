import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText, ClipboardList, BarChart2, Settings, Layers,
  AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import { MobilePageScaffold } from './MobilePageScaffold';
import { useAuthStore } from '@/app/store/auth-store';

interface Tile {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  href: string;
  variant?: 'default' | 'primary' | 'warning' | 'success';
}

export function MobileDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Tiles — inclusief PDF Maken (was missing)
  const tiles: Tile[] = [
    {
      icon: Layers,
      label: 'Projecten',
      sublabel: 'Bekijk en beheer projecten',
      href: '/projecten',
    },
    {
      icon: ClipboardList,
      label: 'Lascontrole',
      sublabel: 'Inspecties en lassen',
      href: '/lascontrole',
    },
    {
      icon: CheckCircle,
      label: 'CE-dossier',
      sublabel: 'Compliance overzicht',
      href: '/ce-dossier',
      variant: 'success',
    },
    {
      icon: FileText,
      label: 'PDF maken',
      sublabel: 'CE-rapport exporteren',
      href: '/rapportage',
      variant: 'primary',
    },
    {
      icon: BarChart2,
      label: 'Rapportage',
      sublabel: 'Overzichten en exports',
      href: '/rapportage',
    },
    {
      icon: Clock,
      label: 'Planning',
      sublabel: 'Inspectieplanning',
      href: '/planning',
    },
    {
      icon: Settings,
      label: 'Instellingen',
      sublabel: 'Masterdata en templates',
      href: '/instellingen',
    },
  ];

  const variantStyle: Record<string, React.CSSProperties> = {
    default: {},
    primary: {
      background: 'var(--color-background-info)',
      borderColor: 'var(--color-border-info)',
    },
    warning: {
      background: 'var(--color-background-warning)',
      borderColor: 'var(--color-border-warning)',
    },
    success: {
      background: 'var(--color-background-success)',
      borderColor: 'var(--color-border-success)',
    },
  };

  const iconColor: Record<string, string> = {
    default: 'var(--color-text-secondary)',
    primary: 'var(--color-text-info)',
    warning: 'var(--color-text-warning)',
    success: 'var(--color-text-success)',
  };

  return (
    <MobilePageScaffold
      header={
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>NEN-1090</div>
          {user?.email && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {user.email}
            </div>
          )}
        </div>
      }
    >
      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const variant = tile.variant ?? 'default';
            return (
              <button
                key={tile.label}
                onClick={() => navigate(tile.href)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '16px',
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-lg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                  ...variantStyle[variant],
                }}
              >
                <Icon
                  size={22}
                  style={{ color: iconColor[variant] }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {tile.label}
                  </div>
                  {tile.sublabel && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {tile.sublabel}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </MobilePageScaffold>
  );
}

export default MobileDashboardPage;
