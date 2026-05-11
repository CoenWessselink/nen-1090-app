import React from 'react';

interface CanonicalAttachmentRendererProps {
  attachments: {
    id: string;
    filename: string;
    url: string;
  }[];
}

export default function CanonicalAttachmentRenderer({
  attachments,
}: CanonicalAttachmentRendererProps) {
  return (
    <div className="canonical-attachment-renderer">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
        >
          {attachment.filename}
        </a>
      ))}
    </div>
  );
}
