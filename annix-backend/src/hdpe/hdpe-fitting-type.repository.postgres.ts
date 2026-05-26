import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpeFittingType } from "./entities/hdpe-fitting-type.entity";
import { HdpeFittingTypeRepository } from "./hdpe-fitting-type.repository";

@Injectable()
export class PostgresHdpeFittingTypeRepository
  extends TypeOrmCrudRepository<HdpeFittingType>
  implements HdpeFittingTypeRepository
{
  constructor(@InjectRepository(HdpeFittingType) repository: Repository<HdpeFittingType>) {
    super(repository);
  }

  findByCode(code: string): Promise<HdpeFittingType | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }

  findActiveOrderedByDisplayOrder(): Promise<HdpeFittingType[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }
}
