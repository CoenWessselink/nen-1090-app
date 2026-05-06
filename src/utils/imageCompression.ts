const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const DEFAULT_QUALITY = 0.82;

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  if (file.size < 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      image.src = String(reader.result || '');
    };

    image.onload = () => {
      const canvas = document.createElement('canvas');

      let width = image.width;
      let height = image.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }

      if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');

      if (!context) {
        resolve(file);
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const compressed = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          console.info('[image-compression] completed', {
            originalSize: file.size,
            compressedSize: compressed.size,
            reduction: Math.round((1 - compressed.size / file.size) * 100),
          });

          resolve(compressed);
        },
        'image/jpeg',
        DEFAULT_QUALITY,
      );
    };

    image.onerror = () => {
      console.warn('[image-compression] failed, using original image');
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}
