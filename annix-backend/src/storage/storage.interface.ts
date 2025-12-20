export interface StorageResult {
  path: string;
  url: string;
  size: number;
  mimeType: string;
  originalFilename: string;
}

export interface IStorageService {
  upload(file: Express.Multer.File, subPath: string): Promise<StorageResult>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  getPublicUrl(path: string): string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
