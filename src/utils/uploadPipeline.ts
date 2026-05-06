import { compressImage } from './imageCompression';
import { withUploadRetry } from './uploadRetry';

export type UploadPipelineOptions = {
  compressImages?: boolean;
  retries?: number;
};

export async function processUploadPipeline(
  file: File,
  upload: (processedFile: File) => Promise<unknown>,
  options: UploadPipelineOptions = {},
): Promise<unknown> {
  const compressImages = options.compressImages ?? true;
  const retries = options.retries ?? 3;

  let processedFile = file;

  console.info('[upload-pipeline] pipeline started', {
    fileName: file.name,
    size: file.size,
    type: file.type,
  });

  if (compressImages && file.type.startsWith('image/')) {
    processedFile = await compressImage(file);
  }

  const result = await withUploadRetry(
    async () => upload(processedFile),
    {
      retries,
    },
  );

  console.info('[upload-pipeline] pipeline completed', {
    fileName: processedFile.name,
    size: processedFile.size,
  });

  return result;
}
