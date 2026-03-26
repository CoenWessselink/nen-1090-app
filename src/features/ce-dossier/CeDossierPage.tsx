import React, { useMemo } from "react";
import { useParams } from "react-router-dom";

export type CeDossierPageProps = {
  projectId?: string;
  dossierData?: Record<string, unknown> | null;
};

const CeDossierPage: React.FC<CeDossierPageProps> = ({
  projectId: projectIdProp,
  dossierData,
}) => {
  const params = useParams<{ projectId?: string; id?: string }>();

  const resolvedProjectId = useMemo(() => {
    return projectIdProp ?? params.projectId ?? params.id ?? "unknown-project";
  }, [projectIdProp, params.id, params.projectId]);

  const resolvedDossierData = useMemo<Record<string, unknown>>(() => {
    if (dossierData && typeof dossierData === "object") {
      return dossierData;
    }

    return {
      projectId: resolvedProjectId,
      generatedAt: new Date().toISOString(),
      status: "concept",
      sections: [],
      note: "CE dossierdata is nog niet meegegeven; pagina blijft wel renderbaar voor router/typecheck.",
    };
  }, [dossierData, resolvedProjectId]);

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(resolvedDossierData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ce-dossier-${resolvedProjectId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">CE Dossier</h1>
            <p className="mt-2 text-sm text-slate-600">
              Project: <span className="font-medium">{resolvedProjectId}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Dossierdata</h2>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm">
          {JSON.stringify(resolvedDossierData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export { CeDossierPage };
export default CeDossierPage;
