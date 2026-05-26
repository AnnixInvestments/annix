import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberDeliveryNoteCorrection } from "../entities/rubber-delivery-note-correction.entity";
import { RubberDeliveryNoteCorrectionRepository } from "./rubber-delivery-note-correction.repository";

@Injectable()
export class PostgresRubberDeliveryNoteCorrectionRepository
  extends TypeOrmCrudRepository<RubberDeliveryNoteCorrection>
  implements RubberDeliveryNoteCorrectionRepository
{
  constructor(
    @InjectRepository(RubberDeliveryNoteCorrection)
    repository: Repository<RubberDeliveryNoteCorrection>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberDeliveryNoteCorrection>): RubberDeliveryNoteCorrection {
    return this.repository.create(data as TypeOrmDeepPartial<RubberDeliveryNoteCorrection>);
  }

  saveMany(entities: RubberDeliveryNoteCorrection[]): Promise<RubberDeliveryNoteCorrection[]> {
    return this.repository.save(entities);
  }

  findRecentBySupplierName(supplierName: string): Promise<RubberDeliveryNoteCorrection[]> {
    return this.repository.find({
      where: { supplierName },
      order: { createdAt: "DESC" },
      take: 40,
    });
  }
}
