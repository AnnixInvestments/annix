import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "./entities/nix-extraction-session.entity";
import { NixExtractionSessionRepository } from "./nix-extraction-session.repository";

@Injectable()
export class PostgresNixExtractionSessionRepository
  extends TypeOrmCrudRepository<NixExtractionSession>
  implements NixExtractionSessionRepository
{
  constructor(
    @InjectRepository(NixExtractionSession) repository: Repository<NixExtractionSession>,
  ) {
    super(repository);
  }

  async sessionsForOwner(
    ownerUserId: number,
    filters: { sourceModule?: string; status?: NixExtractionSessionStatus },
  ): Promise<NixExtractionSession[]> {
    const qb = this.repository
      .createQueryBuilder("session")
      .leftJoin("session.extractions", "ext")
      .addSelect("ext.id")
      .where("session.ownerUserId = :ownerUserId", { ownerUserId })
      .orderBy("session.createdAt", "DESC")
      .take(50);
    if (filters.sourceModule) {
      qb.andWhere("session.sourceModule = :sourceModule", {
        sourceModule: filters.sourceModule,
      });
    }
    if (filters.status) {
      qb.andWhere("session.status = :status", { status: filters.status });
    }
    return qb.getMany();
  }

  sessionsForSource(sourceModule: string, sourceId: number): Promise<NixExtractionSession[]> {
    return this.repository.find({
      where: { sourceModule, sourceId },
      order: { createdAt: "DESC" },
      relations: ["extractions"],
    });
  }

  async unlinkExtractionsFromSession(sessionId: number): Promise<void> {
    await this.repository.manager.query(
      "UPDATE nix_extractions SET session_id = NULL WHERE session_id = $1",
      [sessionId],
    );
  }

  async setJobCardId(sessionId: number, jobCardId: number): Promise<void> {
    await this.repository.update(sessionId, { jobCardId });
  }

  withTransaction(context: TransactionContext): PostgresNixExtractionSessionRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresNixExtractionSessionRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresNixExtractionSessionRepository(
      context.manager.getRepository(NixExtractionSession),
    );
  }
}
