import React from "react";
import { InlineMessage } from "@/components/ui/InlineMessage";
import { Badge } from "@/components/ui/Badge";

type Tone = "success" | "danger" | "neutral";

interface Props {
  canWrite: boolean;
}

export default function MasterDataManager({ canWrite }: Props) {
  const [documents, setDocuments] = React.useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setDocuments(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 space-y-4">

      {/* STATUS */}
      <div className="flex items-center gap-2">
        <Badge tone={canWrite ? "success" : "neutral"}>
          {canWrite ? "Editable" : "Read only"}
        </Badge>
      </div>

      {/* INFO */}
      <InlineMessage tone="neutral">
        Nieuwe documenten worden gekoppeld na opslaan.
      </InlineMessage>

      {/* UPLOAD */}
      <div className="border rounded p-4 bg-white">
        <label className="block text-sm font-medium mb-2">
          Documenten uploaden
        </label>

        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="mb-3"
        />

        {/* DOCUMENT LIJST */}
        <div className="space-y-2">
          {documents.length === 0 && (
            <div className="text-sm text-gray-500">
              Geen documenten geselecteerd
            </div>
          )}

          {documents.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between border rounded px-3 py-2"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="text-blue-600 text-xs"
                  onClick={() => window.open(URL.createObjectURL(file))}
                >
                  Preview
                </button>

                <button
                  className="text-red-600 text-xs"
                  onClick={() => removeFile(index)}
                >
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}