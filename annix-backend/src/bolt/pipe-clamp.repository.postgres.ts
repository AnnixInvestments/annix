import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { PipeClampRepository } from "./pipe-clamp.repository";

@Injectable()
export class PostgresPipeClampRepository
  extends TypeOrmCrudRepository<PipeClampEntity>
  implements PipeClampRepository
{
  constructor(@InjectRepository(PipeClampEntity) repository: Repository<PipeClampEntity>) {
    super(repository);
  }

  async pipeClamps(clampType?: string, nbMm?: number): Promise<PipeClampEntity[]> {
    const query = this.repository.createQueryBuilder("pc");

    if (clampType) {
      query.andWhere("pc.clamp_type = :clampType", { clampType });
    }
    if (nbMm) {
      query.andWhere("pc.nb_mm = :nbMm", { nbMm });
    }

    return query.orderBy("pc.clamp_type", "ASC").addOrderBy("pc.nb_mm", "ASC").getMany();
  }

  async pipeClamp(clampType: string, nbMm: number): Promise<PipeClampEntity | null> {
    return this.repository.findOne({
      where: { clampType, nbMm },
    });
  }

  async pipeClampTypes(): Promise<Array<{ clampType: string; clampDescription: string }>> {
    const results = await this.repository
      .createQueryBuilder("pc")
      .select("pc.clamp_type", "clampType")
      .addSelect("pc.clamp_description", "clampDescription")
      .distinct(true)
      .getRawMany();
    return results;
  }
}
