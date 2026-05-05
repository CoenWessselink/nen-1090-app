import React from "react";
import InlineMessage from "@/components/ui/InlineMessage";
import Badge from "@/components/ui/Badge";

type Props = {
  canWrite?: boolean;
};

export default function MasterDataManager({ canWrite = false }: Props) {
  const [files, setFiles] = React.useState<File[]>([]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  return (
    <div className="p-4 space-y-4">

      <Badge tone={canWrite ? "success" : "neutral"}>
        {canWrite ? "Editable" : "Read only"}
      </Badge>

      <InlineMessage tone="neutral">
        Upload documenten na opslaan
      </InlineMessage>

      <input type="file" multiple onChange={onChange} />

      <div>
        {files.map((f, i) => (
          <div key={i}>
            {f.name}
          </div>
        ))}
      </div>

    </div>
  );
}
