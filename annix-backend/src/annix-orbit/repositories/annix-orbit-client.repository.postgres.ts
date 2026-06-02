import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitClient } from "../entities/annix-orbit-client.entity";
import { AnnixOrbitClientRepository } from "./annix-orbit-client.repository";

@Injectable()
export class PostgresAnnixOrbitClientRepository
  extends TypeOrmCrudRepository<AnnixOrbitClient>
  implements AnnixOrbitClientRepository
{
  constructor(@InjectRepository(AnnixOrbitClient) repository: Repository<AnnixOrbitClient>) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitClient[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitClient | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }
}
