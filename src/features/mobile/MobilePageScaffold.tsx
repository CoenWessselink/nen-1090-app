import React from 'react';

interface MobilePageScaffoldProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Schakel padding-bottom voor bottom-nav uit (bijv. op modals) */
  noBottomPad?: boolean;
}

/**
 * Basis scaffold voor alle mobiele pagina's.
 *
 * Fixes:
 * - env(safe-area-inset-top): voorkomt dat content achter de iPhone-statusbalk valt
 * - env(safe-area-inset-bottom): voorkomt dat content achter de iPhone home-indicator valt
 * - viewport-fit=cover moet in index.html staan (zie index.html fix)
 */
export function MobilePageScaffold({
  header,
  footer,
  children,
  className = '',
  noBottomPad = false,
}: MobilePageScaffoldProps) {
  return (
    <div
      className={`mobile-scaffold ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        // Safe area: voorkomt content achter iPhone notch / statusbalk
        paddingTop: 'env(safe-area-inset-top)',
        // Safe area: voorkomt content achter iPhone home-indicator
        paddingBottom: noBottomPad ? 'env(safe-area-inset-bottom)' : undefined,
      }}
    >
      {header && (
        <div className="mobile-scaffold-header">
          {header}
        </div>
      )}

      <main
        className="mobile-scaffold-content"
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: noBottomPad
            ? undefined
            : 'calc(env(safe-area-inset-bottom) + 72px)', // 72px = bottom nav hoogte
        }}
      >
        {children}
      </main>

      {footer && (
        <div
          className="mobile-scaffold-footer"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export default MobilePageScaffold;
