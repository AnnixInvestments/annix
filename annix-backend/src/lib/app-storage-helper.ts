import {
  type IStorageService,
  StorageArea,
  type StorageResult,
} from "../storage/storage.interface";

export function documentPath(area: StorageArea | string, ...segments: (string | number)[]): string {
  return [area, ...segments.map(String)].filter(Boolean).join("/");
}

export function bufferToMulterFile(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype,
    size: buffer.length,
    buffer,
    stream: null as never,
    destination: "",
    filename: "",
    path: "",
  };
}

export async function uploadDocument(
  storageService: IStorageService,
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  area: StorageArea | string,
  ...pathSegments: (string | number)[]
): Promise<StorageResult> {
  const subPath = documentPath(area, ...pathSegments);
  const multerFile = bufferToMulterFile(buffer, originalname, mimetype);
  return storageService.upload(multerFile, subPath);
}
