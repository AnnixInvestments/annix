import imageCompression from "browser-image-compression";
import { nowISO } from "@/app/lib/datetime";
import { offlinePhotos, type PendingPhoto } from "./stores";

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

export async function queuePhotoUpload(params: {
  entityType: PendingPhoto["entityType"];
  entityId: number;
  file: File;
  uploadUrl: string;
  authHeader: string;
}): Promise<PendingPhoto> {
  const compressed = await compressPhoto(params.file);

  const photo: PendingPhoto = {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    entityType: params.entityType,
    entityId: params.entityId,
    blob: compressed,
    filename: params.file.name || `photo-${Date.now()}.jpg`,
    uploadUrl: params.uploadUrl,
    authHeader: params.authHeader,
    synced: false,
    createdAt: nowISO(),
  };

  await offlinePhotos.save(photo);

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      if ("sync" in registration) {
        (
          registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          }
        ).sync.register("sync-photos");
      }
    });
  }

  return photo;
}

export async function syncPendingPhotos(authHeader: string): Promise<{
  synced: number;
  failed: number;
}> {
  const unsyncedPhotos = await offlinePhotos.unsyncedPhotos();
  let synced = 0;
  let failed = 0;

  for (const photo of unsyncedPhotos) {
    try {
      const formData = new FormData();
      formData.append("file", photo.blob, photo.filename);

      const response = await fetch(photo.uploadUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      });

      if (response.ok) {
        await offlinePhotos.markSynced(photo.id);
        synced += 1;
      } else {
        failed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function pendingPhotoCount(): Promise<number> {
  return offlinePhotos.unsyncedCount();
}

export async function photoDataUrl(photoId: string): Promise<string | null> {
  const photo = await offlinePhotos.byId(photoId);
  if (!photo) {
    return null;
  }
  return fileToDataUrl(photo.blob);
}
