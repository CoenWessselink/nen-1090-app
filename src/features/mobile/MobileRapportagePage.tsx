import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, RefreshCcw } from 'lucide-react';
import { MobilePageScaffold } from './MobilePageScaffold';

/**
 * Mobiele rapportage-pagina — full-width layout.
 * Fix: container-breedte was beperkt; nu width: 100% op alle niveaus.
 */
export function MobileRapportagePage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    setLoading(true);
    setError(null);
    try {
      // Navigeer naar PDF-download endpoint; browser handelt download af
      const url = `/api/v1/projects/${projectId}/ce-dossier/pdf?download=true`;
      window.location.href = url;
    } catch (err) {
      setError('PDF downloaden mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobilePageScaffold
      header={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary)',
            // Full-width header
            width: '100%',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>
            Rapportage
          </span>
          <button
            onClick={handleDownloadPdf}
            disabled={loading || !projectId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'var(--color-background-info)',
              color: 'var(--color-text-info)',
              border: '0.5px solid var(--color-border-info)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {loading ? <RefreshCcw size={14} className="spin" /> : <Download size={14} />}
            PDF
          </button>
        </div>
      }
    >
      {/* Full-width content — geen max-width beperking */}
      <div
        style={{
          width: '100%',
          padding: '0',
          boxSizing: 'border-box',
        }}
      >
        {error && (
          <div
            style={{
              margin: '12px 16px',
              padding: '12px',
              background: 'var(--color-background-danger)',
              color: 'var(--color-text-danger)',
              borderRadius: 'var(--border-radius-md)',
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {!projectId ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>
              Selecteer eerst een project om de rapportage te bekijken.
            </p>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            {/* PDF inline viewer — full-width */}
            <iframe
              src={`/api/v1/projects/${projectId}/ce-dossier/pdf`}
              style={{
                width: '100%',
                height: 'calc(100dvh - 120px)',
                border: 'none',
                display: 'block',
              }}
              title="CE Dossier PDF"
            />
          </div>
        )}
      </div>
    </MobilePageScaffold>
  );
}

export default MobileRapportagePage;
