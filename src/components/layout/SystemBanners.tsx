import { AlertTriangle, CloudOff, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useApiStatusStore } from '@/app/store/api-status-store';
import { useSession } from '@/app/session/SessionContext';
import { useExitImpersonation } from '@/hooks/useTenants';
import { useUiStore } from '@/app/store/ui-store';

export function SystemBanners() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const health = useSystemHealth();
  const degraded = useApiStatusStore((state) => state.degraded);
  const sessionExpired = useApiStatusStore((state) => state.sessionExpired);
  const lastMessage = useApiStatusStore((state) => state.lastMessage);
  const session = useSession();
  const exitImpersonation = useExitImpersonation();
  const pushNotification = useUiStore((state) => state.pushNotification);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="system-banners">
      {!online ? (
        <div className="system-banner system-banner-warning">
          <CloudOff size={16} />
          <span>Offline modus actief. Wijzigingen kunnen mislukken tot de verbinding terug is.</span>
        </div>
      ) : null}
      {session.isImpersonating ? (
        <div className="system-banner system-banner-warning system-banner-actionable">
          <ShieldAlert size={16} />
          <span>Je kijkt nu mee in tenant {session.impersonationTenantName || session.tenant || 'onbekend'} als SuperAdmin.</span>
          <button
            type="button"
            className="system-banner-action"
            onClick={async () => {
              try {
                await exitImpersonation.mutateAsync();
                pushNotification({ title: 'Tenant-view beëindigd', description: 'De oorspronkelijke SuperAdmin-sessie is hersteld.', tone: 'success' });
              } catch (error) {
                pushNotification({ title: 'Tenant-view beëindigen mislukt', description: error instanceof Error ? error.message : 'Onbekende fout.', tone: 'error' });
              }
            }}
          >
            <LogOut size={14} /> Verlaat tenant-view
          </button>
        </div>
      ) : null}
      {sessionExpired ? (
        <div className="system-banner system-banner-warning">
          <ShieldAlert size={16} />
          <span>{lastMessage || 'Je sessie is verlopen. Log opnieuw in om verder te gaan.'}</span>
        </div>
      ) : null}
      {health.isError ? (
        <div className="system-banner system-banner-danger">
          <AlertTriangle size={16} />
          <span>Health-check van de bestaande backend is momenteel niet bereikbaar.</span>
        </div>
      ) : null}
      {degraded && !health.isError && !sessionExpired ? (
        <div className="system-banner system-banner-warning">
          <AlertTriangle size={16} />
          <span>{lastMessage || 'De backend reageert afwijkend. Controleer endpoint-contracten en sessiestatus.'}</span>
        </div>
      ) : null}
      {health.data && !health.isError ? (
        <div className="system-banner system-banner-success">
          <ShieldCheck size={16} />
          <span>Backend health-check actief.</span>
        </div>
      ) : null}
    </div>
  );
}
