import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberDeliveryNoteCorrection } from "../entities/rubber-delivery-note-correction.entity";

export abstract class RubberDeliveryNoteCorrectionRepository extends CrudRepository<RubberDeliveryNoteCorrection> {
  abstract build(data: Partial<RubberDeliveryNoteCorrection>): RubberDeliveryNoteCorrection;
  abstract saveMany(
    entities: RubberDeliveryNoteCorrection[],
  ): Promise<RubberDeliveryNoteCorrection[]>;
  abstract findRecentBySupplierName(supplierName: string): Promise<RubberDeliveryNoteCorrection[]>;
}
