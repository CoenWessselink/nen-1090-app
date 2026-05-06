export type UploadChunk = {
  index: number;
  start: number;
  end: number;
  size: number;
};

export type ChunkedUploadOptions = {
  chunkSize?: number;
};

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

export function createUploadChunks(file: File, options: ChunkedUploadOptions = {}): UploadChunk[] {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;

  const chunks: UploadChunk[] = [];

  let index = 0;
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);

    chunks.push({
      index,
      start: offset,
      end,
      size: end - offset,
    });

    offset = end;
    index += 1;
  }

  console.info('[chunk-upload] chunks created', {
    fileName: file.name,
    chunks: chunks.length,
  });

  return chunks;
}

export async function uploadChunkedFile(
  file: File,
  uploadChunk: (blob: Blob, chunk: UploadChunk) => Promise<void>,
  options: ChunkedUploadOptions = {},
): Promise<void> {
  const chunks = createUploadChunks(file, options);

  for (const chunk of chunks) {
    const blob = file.slice(chunk.start, chunk.end);

    await uploadChunk(blob, chunk);
  }

  console.info('[chunk-upload] upload completed', {
    fileName: file.name,
  });
}
