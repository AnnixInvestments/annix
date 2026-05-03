export enum StorageArea {
  ANNIX_APP = "annix-app",
  AU_RUBBER = "au-rubber",
  ANNIX_REP = "fieldflow",
  CV_ASSISTANT = "cv-assistant",
  SECURE_DOCUMENTS = "secure-documents",
  STOCK_CONTROL = "stock-control",
  STOCK_MANAGEMENT = "stock-management",
  COMPLY_SA = "comply-sa",
  AU_INDUSTRIES = "au-industries",
  PLATFORM = "platform",
  TEACHER_ASSISTANT = "teacher-assistant",
}

export function companyStoragePath(companyId: number, category: string, subPath?: string): string {
  const base = `${StorageArea.PLATFORM}/companies/${companyId}/${category}`;
  return subPath ? `${base}/${subPath}` : base;
}

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
  publicUrl(path: string): string;
  presignedUrl(path: string, expiresIn?: number): Promise<string>;
}

export const STORAGE_SERVICE = "STORAGE_SERVICE";
