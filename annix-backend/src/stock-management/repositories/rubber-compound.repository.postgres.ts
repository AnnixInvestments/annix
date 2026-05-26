import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  type QueryDeepPartialEntity,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberCompound } from "../entities/rubber-compound.entity";
import { RubberCompoundRepository } from "./rubber-compound.repository";

@Injectable()
export class PostgresRubberCompoundRepository
  extends TypeOrmCrudRepository<RubberCompound>
  implements RubberCompoundRepository
{
  constructor(@InjectRepository(RubberCompound) repository: Repository<RubberCompound>) {
    super(repository);
  }

  build(data: DeepPartial<RubberCompound>): RubberCompound {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompound>);
  }

  saveMany(compounds: RubberCompound[]): Promise<RubberCompound[]> {
    return this.repository.save(compounds);
  }

  findForCompany(companyId: number, includeInactive: boolean): Promise<RubberCompound[]> {
    const where: { companyId: number; active?: boolean } = { companyId };
    if (!includeInactive) {
      where.active = true;
    }
    return this.repository.find({
      where,
      order: { compoundFamily: "ASC", shoreHardness: "ASC", name: "ASC" },
    });
  }

  findOneForCompany(companyId: number, id: number): Promise<RubberCompound | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneByCode(companyId: number, code: string): Promise<RubberCompound | null> {
    return this.repository.findOne({ where: { companyId, code } });
  }

  findAllForCompany(companyId: number): Promise<RubberCompound[]> {
    return this.repository.find({ where: { companyId } });
  }

  async updateById(id: number, patch: DeepPartial<RubberCompound>): Promise<void> {
    await this.repository.update(id, patch as QueryDeepPartialEntity<RubberCompound>);
  }
}
