import { BookMarked, DatabaseZap, Layers3, Settings2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

type SettingsOverviewKey = 'masterdata' | 'organisatie' | 'templates' | 'normeringen';

type SettingsOverviewTilesProps = {
  activeKey?: SettingsOverviewKey;
  masterDataCount?: number;
  inspectionTemplateCount?: number;
  companyName?: string;
  onSelect?: (key: SettingsOverviewKey) => void;
};

function displayCompanyName(value?: string) {
  const trimmed = String(value || '').trim();
  return trimmed || 'Organisatie';
}

export function SettingsOverviewTiles({
  activeKey,
  masterDataCount,
  inspectionTemplateCount,
  companyName,
  onSelect,
}: SettingsOverviewTilesProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentKey: SettingsOverviewKey =
    activeKey ||
    (location.pathname.includes('/instellingen/templates')
      ? 'templates'
      : location.pathname.includes('/instellingen/normeringen')
        ? 'normeringen'
        : 'masterdata');

  const goTo = (key: SettingsOverviewKey) => {
    if (onSelect && (key === 'masterdata' || key === 'organisatie')) {
      onSelect(key);
      return;
    }
    if (key === 'masterdata') navigate('/settings-v2');
    if (key === 'organisatie') navigate('/settings-v2?tab=organisatie');
    if (key === 'templates') navigate('/instellingen/templates');
    if (key === 'normeringen') navigate('/instellingen/normeringen');
  };

  const tiles = [
    {
      key: 'masterdata' as const,
      label: 'Masterdata',
      value: typeof masterDataCount === 'number' ? String(masterDataCount) : 'Data',
      subtitle: 'WPS, materialen, lassers',
      icon: DatabaseZap,
      tone: 'primary',
    },
    {
      key: 'organisatie' as const,
      label: 'Organisatie',
      value: displayCompanyName(companyName),
      subtitle: 'Bedrijfsinstellingen',
      icon: Settings2,
      tone: 'success',
    },
    {
      key: 'templates' as const,
      label: 'Inspection templates',
      value: typeof inspectionTemplateCount === 'number' ? String(inspectionTemplateCount) : 'Templates',
      subtitle: 'Templatebeheer',
      icon: Layers3,
      tone: 'danger',
    },
    {
      key: 'normeringen' as const,
      label: 'Normeringen',
      value: 'NEN',
      subtitle: 'Normprofielen',
      icon: BookMarked,
      tone: 'warning',
    },
  ];

  return (
    <div className="settings-overview-grid" data-no-translate="true">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const active = currentKey === tile.key;
        return (
          <button
            key={tile.key}
            type="button"
            className={`settings-overview-tile settings-overview-tile-${tile.tone} ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => goTo(tile.key)}
          >
            <span className="settings-overview-icon" aria-hidden="true">
              <Icon size={22} />
            </span>
            <span className="settings-overview-label">{tile.label}</span>
            <strong className="settings-overview-value">{tile.value}</strong>
            <span className="settings-overview-subtitle">{tile.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
