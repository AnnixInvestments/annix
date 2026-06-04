import imageCompression from "browser-image-compression";

export interface PhotoCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: PhotoCompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export async function compressPhoto(
  file: File,
  options: PhotoCompressionOptions = {},
): Promise<Blob> {
  const mergedOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  const compressed = await imageCompression(file, {
    maxSizeMB: mergedOptions.maxSizeMB,
    maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
    useWebWorker: mergedOptions.useWebWorker,
  });

  return compressed;
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
