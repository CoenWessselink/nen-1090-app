import { ChangeEvent, DragEvent, useRef } from 'react';
import { UploadCloud } from 'lucide-react';

export function UploadDropzone({
  onFiles,
  multiple = true,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const emitFiles = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    emitFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`upload-dropzone ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) inputRef.current?.click();
      }}
    >
      <UploadCloud size={22} />
      <strong>Sleep bestanden hierheen of klik om te selecteren</strong>
      <span>Multi-upload, documentfoto's en certificaten worden via de bestaande backend doorgestuurd.</span>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple={multiple}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => emitFiles(event.target.files)}
      />
    </div>
  );
}
