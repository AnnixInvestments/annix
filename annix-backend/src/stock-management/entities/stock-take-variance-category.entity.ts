export type VarianceCategorySeverity = "low" | "medium" | "high" | "critical";

export class StockTakeVarianceCategory {
  id: number;

  companyId: number;

  slug: string;

  name: string;

  description: string | null;

  sortOrder: number;

  requiresPhoto: boolean;

  requiresIncidentRef: boolean;

  notifyOnSubmit: string[];

  severity: VarianceCategorySeverity;

  active: boolean;

  createdAt: Date;

  updatedAt: Date;
}
