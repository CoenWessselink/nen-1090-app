import { processUploadPipeline } from './uploadPipeline';
import {
  startExportSession,
  markExportRunning,
  markExportCompleted,
  markExportFailed,
} from './exportState';
import { validateCeCompleteness, type CeValidationInput } from './ceCompletenessValidator';
import { buildCeExportFilename, buildCeExportFolderStructure } from './exportNaming';
import {
  logPdfRenderStart,
  logPdfRenderCompleted,
  logPdfRenderFailed,
} from './pdfMemoryGuard';

export async function executeEnterpriseUpload(
  file: File,
  upload: (processedFile: File) => Promise<unknown>,
): Promise<unknown> {
  console.info('[enterprise-upload] integration started', {
    fileName: file.name,
  });

  const result = await processUploadPipeline(file, upload, {
    compressImages: true,
    retries: 3,
  });

  console.info('[enterprise-upload] integration completed', {
    fileName: file.name,
  });

  return result;
}

export async function executeCeExportWorkflow(
  exportId: string,
  validationInput: CeValidationInput,
  exportAction: () => Promise<unknown>,
): Promise<{
  filename: string;
  folders: string[];
  result: unknown;
}> {
  startExportSession(exportId);

  try {
    const validation = validateCeCompleteness(validationInput);

    if (!validation.valid) {
      throw new Error(`CE dossier onvolledig: ${validation.missingItems.join(', ')}`);
    }

    const filename = buildCeExportFilename({
      projectName: validationInput.projectName,
      projectNumber: validationInput.projectNumber,
      exportType: 'CE-Dossier',
      extension: 'pdf',
    });

    const folders = buildCeExportFolderStructure({
      projectName: validationInput.projectName,
      projectNumber: validationInput.projectNumber,
    });

    markExportRunning(exportId);

    logPdfRenderStart(exportId);

    const result = await exportAction();

    logPdfRenderCompleted(exportId);

    markExportCompleted(exportId);

    console.info('[enterprise-export] workflow completed', {
      exportId,
      filename,
      folders,
    });

    return {
      filename,
      folders,
      result,
    };
  } catch (error) {
    logPdfRenderFailed(exportId, error);

    markExportFailed(exportId, error);

    console.error('[enterprise-export] workflow failed', {
      exportId,
      error,
    });

    throw error;
  }
}
