export class StockControlCompanyRole {
  id: number;

  companyId: number;

  key: string;

  label: string;

  isSystem: boolean;

  sortOrder: number;
  unifiedCompanyId?: number | null;

  createdAt: Date;
}
