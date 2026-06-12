import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitAuditEvent } from "../entities/annix-orbit-audit-event.entity";
import { AnnixOrbitAuditEventRepository } from "./annix-orbit-audit-event.repository";

@Injectable()
export class PostgresAnnixOrbitAuditEventRepository
  extends TypeOrmCrudRepository<AnnixOrbitAuditEvent>
  implements AnnixOrbitAuditEventRepository
{
  constructor(
    @InjectRepository(AnnixOrbitAuditEvent) repository: Repository<AnnixOrbitAuditEvent>,
  ) {
    super(repository);
  }

  findForCandidate(candidateId: number, companyId: number): Promise<AnnixOrbitAuditEvent[]> {
    return this.repository.find({
      where: { candidateId, companyId },
      order: { createdAt: "DESC" },
    });
  }
}
