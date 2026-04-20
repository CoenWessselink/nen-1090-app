import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, FileText, RefreshCcw } from 'lucide-react';
import { MobilePageScaffold } from '@/features/mobile/MobilePageScaffold';

/**
 * G-10 fix: rapportage mobiel full-width.
 * Fix: MobilePageScaffold gebruikt title/subtitle/backTo/rightSlot interface.
 */
export function MobileRapportagePage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      window.location.href = `/api/v1/projects/${projectId}/exports/ce-report`;
    } catch {
      setError('PDF downloaden mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobilePageScaffold
      title="Rapportage"
      subtitle="CE-dossier exporteren"
      backTo={projectId ? `/projecten/${projectId}/overzicht` : '/dashboard'}
      rightSlot={
        <button
          onClick={handleDownloadPdf}
          disabled={loading || !projectId}
          aria-label="PDF downloaden"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px',
            background: 'var(--color-background-info)',
            color: 'var(--color-text-info)',
            border: '0.5px solid var(--color-border-info)',
            borderRadius: 'var(--border-radius-md)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {loading ? <RefreshCcw size={14} /> : <Download size={14} />}
          PDF
        </button>
      }
    >
      {/* G-10: full-width — geen max-width of padding die breedte beperkt */}
      <div style={{ width: '100%', padding: 0, boxSizing: 'border-box' }}>
        {error && (
          <div style={{
            margin: '12px 16px', padding: 12,
            background: 'var(--color-background-danger)',
            color: 'var(--color-text-danger)',
            borderRadius: 'var(--border-radius-md)', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {!projectId ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Selecteer eerst een project om de rapportage te bekijken.</p>
          </div>
        ) : (
          /* PDF inline viewer — volledig schermbreed */
          <iframe
            src={`/api/v1/projects/${projectId}/exports/ce-dossier/pdf`}
            style={{
              width: '100%',
              height: 'calc(100dvh - 104px)',
              border: 'none',
              display: 'block',
            }}
            title="CE Dossier PDF"
          />
        )}
      </div>
    </MobilePageScaffold>
  );
}

export default MobileRapportagePage;
