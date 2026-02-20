export class ImportStockDto {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  unitOfMeasure?: string;
  costPerUnit?: number;
  quantity?: number;
  minStockLevel?: number;
  location?: string;
}
