import React from "react";

type Props = {
  projectId: string;
  dossierData: Record<string, unknown>;
};

const CeDossierPage: React.FC<Props> = ({ projectId, dossierData }) => {
  const handleDownload = () => {
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
    <div>
      <h1>CE Dossier</h1>
      <button onClick={handleDownload}>Download</button>
    </div>
  );
};

// ✅ FIX: both named and default export
export { CeDossierPage };
export default CeDossierPage;
