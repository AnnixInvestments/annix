import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitEeSectoralTarget } from "../entities/annix-orbit-ee-sectoral-target.entity";
import { AnnixOrbitEeSectoralTargetRepository } from "./annix-orbit-ee-sectoral-target.repository";

@Injectable()
export class PostgresAnnixOrbitEeSectoralTargetRepository
  extends TypeOrmCrudRepository<AnnixOrbitEeSectoralTarget>
  implements AnnixOrbitEeSectoralTargetRepository
{
  constructor(
    @InjectRepository(AnnixOrbitEeSectoralTarget)
    repository: Repository<AnnixOrbitEeSectoralTarget>,
  ) {
    super(repository);
  }

  listOrdered(): Promise<AnnixOrbitEeSectoralTarget[]> {
    return this.repository.find({
      order: { sectorCode: "ASC", occupationalLevel: "ASC", targetMetric: "ASC" },
    });
  }

  findBySectorCode(sectorCode: string): Promise<AnnixOrbitEeSectoralTarget[]> {
    return this.repository.find({ where: { sectorCode } });
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.repository.delete(id);
    return result.affected ?? 0;
  }
}
