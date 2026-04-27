import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type ModuleHeroTile = {
  label: string;
  value?: ReactNode;
  meta?: ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
};

function TileBody({ tile }: { tile: ModuleHeroTile }) {
  const Icon = tile.icon;

  return (
    <>
      <div className="module-hero-tile-top">
        {Icon ? <Icon size={18} /> : null}
        <span>{tile.label}</span>
      </div>
      {tile.value ? <strong>{tile.value}</strong> : null}
      {tile.meta ? <small>{tile.meta}</small> : null}
    </>
  );
}

export function ModuleHero({
  title,
  description,
  kicker = 'Werkgebied',
  actions,
  tiles,
}: {
  title: string;
  description: string;
  kicker?: string;
  actions?: ReactNode;
  tiles: ModuleHeroTile[];
}) {
  return (
    <div className="module-hero-shell">
      <div className="module-hero-main">
        <div className="module-hero-copy">
          <div className="module-hero-kicker">{kicker}</div>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        {actions ? <div className="module-hero-actions">{actions}</div> : null}
      </div>

      <div className="module-hero-grid">
        {tiles.map((tile) => (
          tile.onClick ? (
            <button
              key={tile.label}
              type="button"
              className={`module-hero-tile module-hero-tile-${tile.tone || 'primary'}`}
              onClick={tile.onClick}
            >
              <TileBody tile={tile} />
            </button>
          ) : (
            <div key={tile.label} className={`module-hero-tile module-hero-tile-${tile.tone || 'primary'}`}>
              <TileBody tile={tile} />
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export default ModuleHero;
