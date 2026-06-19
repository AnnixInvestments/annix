import { RubberCompoundBatch } from "./rubber-compound-batch.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export class RubberCocBatchCorrection {
  id: number;

  supplierCoc: RubberSupplierCoc;

  supplierCocId: number;

  compoundBatch: RubberCompoundBatch;

  compoundBatchId: number;

  supplierName: string | null;

  compoundCode: string | null;

  batchNumber: string;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  correctedBy: string | null;

  createdAt: Date;
}
