import React from "react";

type Props = {
  projectId: string;
  dossierData: Record<string, unknown>;
};

const CeDossierPage: React.FC<Props> = ({ projectId, dossierData }) => {

  const handleDownload = () => {
    // ✅ FIX: correct Blob creation instead of invalid cast
    const blob = new Blob(
      [JSON.stringify(dossierData, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ce-dossier-${projectId}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>CE Dossier</h1>

      <button onClick={handleDownload}>
        Download CE dossier
      </button>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(dossierData, null, 2)}
      </pre>
    </div>
  );
};

export default CeDossierPage;
