import type { ReactNode } from 'react';
import { Bell, ChevronLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/app/store/ui-store';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  backTo?: string | null;
  rightSlot?: ReactNode;
};

/**
 * MobilePageScaffold — originele interface behouden.
 * Fix toegevoegd: env(safe-area-inset-top/bottom) voor iPhones met notch/Dynamic Island.
 * Vereist viewport-fit=cover in index.html (reeds geleverd).
 */
export function MobilePageScaffold({ title, subtitle, children, backTo = null, rightSlot }: Props) {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const toggleNotificationCenter = useUiStore((state) => state.toggleNotificationCenter);

  return (
    <div
      className="mobile-page"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <header className="mobile-page-header">
        <div className="mobile-page-header-row">
          {backTo ? (
            <button className="mobile-icon-button" type="button" onClick={() => navigate(backTo)} aria-label="Terug">
              <ChevronLeft size={18} />
            </button>
          ) : (
            <button className="mobile-icon-button" type="button" onClick={toggleSidebar} aria-label="Menu openen">
              <Menu size={18} />
            </button>
          )}
          <div className="mobile-page-header-copy">
            <strong>{title}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          {rightSlot || (
            <button className="mobile-icon-button" type="button" onClick={toggleNotificationCenter} aria-label="Meldingen">
              <Bell size={18} />
            </button>
          )}
        </div>
      </header>
      <div className="mobile-page-body">{children}</div>
    </div>
  );
}
