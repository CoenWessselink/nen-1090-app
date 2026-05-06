export type ExportNamingInput = {
  projectName?: string;
  projectNumber?: string;
  exportType?: string;
  extension?: string;
};

function sanitize(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function currentDateStamp(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

export function buildCeExportFilename(input: ExportNamingInput): string {
  const projectName = sanitize(input.projectName || 'Project');
  const projectNumber = sanitize(input.projectNumber || 'UNKNOWN');
  const exportType = sanitize(input.exportType || 'CE-Dossier');
  const extension = input.extension || 'pdf';

  const filename = `${exportType}-${projectName}-${projectNumber}-${currentDateStamp()}.${extension}`;

  console.info('[ce-export] generated filename', {
    filename,
  });

  return filename;
}

export function buildCeExportFolderStructure(input: ExportNamingInput): string[] {
  const base = `${sanitize(input.projectName || 'Project')}-${sanitize(input.projectNumber || 'UNKNOWN')}`;

  const structure = [
    `${base}/CE-Dossier`,
    `${base}/Foto-Bijlagen`,
    `${base}/Inspecties`,
    `${base}/WPS`,
    `${base}/Materialen`,
  ];

  console.info('[ce-export] generated folder structure', {
    structure,
  });

  return structure;
}
