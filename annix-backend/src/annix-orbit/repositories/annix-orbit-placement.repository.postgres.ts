import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitPlacement } from "../entities/annix-orbit-placement.entity";
import { AnnixOrbitPlacementRepository } from "./annix-orbit-placement.repository";

@Injectable()
export class PostgresAnnixOrbitPlacementRepository
  extends TypeOrmCrudRepository<AnnixOrbitPlacement>
  implements AnnixOrbitPlacementRepository
{
  constructor(@InjectRepository(AnnixOrbitPlacement) repository: Repository<AnnixOrbitPlacement>) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitPlacement[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitPlacement | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
