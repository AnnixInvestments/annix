import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitShortlist } from "../entities/annix-orbit-shortlist.entity";
import { AnnixOrbitShortlistRepository } from "./annix-orbit-shortlist.repository";

@Injectable()
export class PostgresAnnixOrbitShortlistRepository
  extends TypeOrmCrudRepository<AnnixOrbitShortlist>
  implements AnnixOrbitShortlistRepository
{
  constructor(@InjectRepository(AnnixOrbitShortlist) repository: Repository<AnnixOrbitShortlist>) {
    super(repository);
  }

  findByCompany(companyId: number): Promise<AnnixOrbitShortlist[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitShortlist | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByShareToken(token: string): Promise<AnnixOrbitShortlist | null> {
    return this.repository.findOne({ where: { shareToken: token } });
  }
}
