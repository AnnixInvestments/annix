import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingTypeRepository } from "./pvc-fitting-type.repository";

@Injectable()
export class PostgresPvcFittingTypeRepository
  extends TypeOrmCrudRepository<PvcFittingType>
  implements PvcFittingTypeRepository
{
  constructor(@InjectRepository(PvcFittingType) repository: Repository<PvcFittingType>) {
    super(repository);
  }

  findActive(): Promise<PvcFittingType[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findByCode(code: string): Promise<PvcFittingType | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }
}
