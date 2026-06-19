export enum ImportJobStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export class JobCardImportJob {
  id: number;

  companyId: number;

  createdByUserId: number | null;

  status: string;

  fileName: string;

  totalDocuments: number;

  completedDocuments: number;

  currentDocumentName: string | null;

  drawingRows: Record<string, unknown>[];

  qualityDocuments: string[];

  documentNumber: string | null;

  sourceFilePath: string | null;

  sourceFileName: string | null;

  error: string | null;

  acknowledged: boolean;

  createdAt: Date;

  updatedAt: Date;
}
