import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { HdpeStandard } from "./entities/hdpe-standard.entity";
import { HdpeStandardRepository } from "./hdpe-standard.repository";

@Injectable()
export class PostgresHdpeStandardRepository
  extends TypeOrmCrudRepository<HdpeStandard>
  implements HdpeStandardRepository
{
  constructor(@InjectRepository(HdpeStandard) repository: Repository<HdpeStandard>) {
    super(repository);
  }

  findByCode(code: string): Promise<HdpeStandard | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }

  findActiveOrderedByDisplayOrder(): Promise<HdpeStandard[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }
}
