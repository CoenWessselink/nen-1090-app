import React, { ChangeEvent } from 'react';

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList) => void;
}

export default function UploadDropzone({
  onFilesSelected,
}: UploadDropzoneProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) {
      return;
    }

    onFilesSelected(event.target.files);
  }

  return (
    <label className="enterprise-upload-dropzone">
      <input
        type="file"
        multiple
        onChange={handleChange}
        hidden
      />

      <div>
        Upload enterprise attachments
      </div>
    </label>
  );
}
