import React from 'react';

interface Attachment {
  id: string;
  filename: string;
  url: string;
  uploaded_at?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
}

export default function AttachmentList({
  attachments,
}: AttachmentListProps) {
  if (!attachments.length) {
    return <div>No attachments</div>;
  }

  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="attachment-item"
        >
          <div>{attachment.filename}</div>
          <div>{attachment.uploaded_at}</div>
        </a>
      ))}
    </div>
  );
}
