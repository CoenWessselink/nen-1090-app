import { useNavigate } from 'react-router-dom';
import {
  FileText, ClipboardList, BarChart2, Settings, Layers,
  CheckCircle, Clock,
} from 'lucide-react';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';
import { useAuthStore } from '@/app/store/auth-store';

interface Tile {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  href: string;
  accent?: boolean;
}

// G-08 fix: PDF Maken tegel toegevoegd
const TILES: Tile[] = [
  { icon: Layers,       label: 'Projecten',   sublabel: 'Bekijk en beheer projecten',    href: '/projecten' },
  { icon: ClipboardList, label: 'Lascontrole', sublabel: 'Inspecties en lassen',          href: '/lascontrole' },
  { icon: CheckCircle,  label: 'CE-dossier',  sublabel: 'Compliance overzicht',           href: '/ce-dossier' },
  { icon: FileText,     label: 'PDF maken',   sublabel: 'CE-rapport exporteren',          href: '/rapportage', accent: true },
  { icon: BarChart2,    label: 'Rapportage',  sublabel: 'Overzichten en exports',         href: '/rapportage' },
  { icon: Clock,        label: 'Planning',    sublabel: 'Inspectieplanning',              href: '/planning' },
  { icon: Settings,     label: 'Instellingen', sublabel: 'Masterdata en templates',      href: '/instellingen' },
];

export function MobileDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    // Fix: MobilePageScaffold verwacht title + optioneel subtitle, niet header/footer
    <MobilePageScaffold title="Dashboard" subtitle={user?.email ?? undefined}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.label}
                onClick={() => navigate(tile.href)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 16,
                  background: tile.accent
                    ? 'var(--color-background-info)'
                    : 'var(--color-background-primary)',
                  border: tile.accent
                    ? '0.5px solid var(--color-border-info)'
                    : '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 'var(--border-radius-lg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <Icon
                  size={22}
                  style={{ color: tile.accent ? 'var(--color-text-info)' : 'var(--color-text-secondary)' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{tile.label}</div>
                  {tile.sublabel && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
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
