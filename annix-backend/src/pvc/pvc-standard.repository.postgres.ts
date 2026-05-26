import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcStandardRepository } from "./pvc-standard.repository";

@Injectable()
export class PostgresPvcStandardRepository
  extends TypeOrmCrudRepository<PvcStandard>
  implements PvcStandardRepository
{
  constructor(@InjectRepository(PvcStandard) repository: Repository<PvcStandard>) {
    super(repository);
  }

  findActive(): Promise<PvcStandard[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC", name: "ASC" },
    });
  }

  findByCode(code: string): Promise<PvcStandard | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }
}
