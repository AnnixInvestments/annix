export class AnnixSentinelGovernmentDocument {
  id!: number;

  name!: string;

  description!: string;

  category!: string;

  categoryLabel!: string;

  department!: string | null;

  departmentUrl!: string | null;

  sourceUrl!: string;

  filePath!: string | null;

  synced!: boolean;

  sizeBytes!: number | null;

  mimeType!: string | null;

  sortOrder!: number;

  createdAt!: Date;

  updatedAt!: Date;
}
