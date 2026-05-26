import { CrudRepository } from "../lib/persistence/crud-repository";
import type { DeliveryNotePage } from "./delivery-note.service";
import type { DeliveryNoteFilterDto } from "./dto/delivery-note.dto";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";

export abstract class DeliveryNoteRepository extends CrudRepository<PlatformDeliveryNote> {
  abstract search(companyId: number, filters: DeliveryNoteFilterDto): Promise<DeliveryNotePage>;
  abstract findByCompanyAndId(
    companyId: number,
    id: number,
    relations?: string[],
  ): Promise<PlatformDeliveryNote | null>;
  abstract findByLegacyScId(id: number): Promise<PlatformDeliveryNote | null>;
  abstract findByLegacyRubberId(id: number): Promise<PlatformDeliveryNote | null>;
}
