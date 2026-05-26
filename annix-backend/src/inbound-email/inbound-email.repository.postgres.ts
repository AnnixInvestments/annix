import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { InboundEmail, InboundEmailStatus } from "./entities/inbound-email.entity";
import {
  InboundEmailFilters,
  InboundEmailPage,
  InboundEmailRepository,
  InboundEmailStatusCounts,
} from "./inbound-email.repository";

@Injectable()
export class PostgresInboundEmailRepository
  extends TypeOrmCrudRepository<InboundEmail>
  implements InboundEmailRepository
{
  constructor(@InjectRepository(InboundEmail) repository: Repository<InboundEmail>) {
    super(repository);
  }

  async existsByMessageId(messageId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { messageId } });
    return count > 0;
  }

  async updateStatus(
    id: number,
    status: InboundEmailStatus,
    errorMessage: string | null,
  ): Promise<void> {
    await this.repository.update(id, {
      processingStatus: status,
      errorMessage: errorMessage ?? null,
    });
  }

  async listByAppAndCompany(
    app: string,
    companyId: number,
    filters: InboundEmailFilters,
  ): Promise<InboundEmailPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    const qb = this.repository
      .createQueryBuilder("email")
      .leftJoinAndSelect("email.attachments", "attachment")
      .where("email.app = :app", { app })
      .andWhere("email.company_id = :companyId", { companyId })
      .orderBy("email.created_at", "DESC");

    if (filters.status) {
      qb.andWhere("email.processing_status = :status", { status: filters.status });
    }

    if (filters.dateFrom) {
      qb.andWhere("email.created_at >= :dateFrom", { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere("email.created_at <= :dateTo", { dateTo: filters.dateTo });
    }

    if (filters.documentType) {
      qb.andWhere("attachment.document_type = :docType", { docType: filters.documentType });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async statsByAppAndCompany(app: string, companyId: number): Promise<InboundEmailStatusCounts> {
    const results = await this.repository
      .createQueryBuilder("email")
      .select("email.processing_status", "status")
      .addSelect("COUNT(*)", "count")
      .where("email.app = :app", { app })
      .andWhere("email.company_id = :companyId", { companyId })
      .groupBy("email.processing_status")
      .getRawMany();

    const counts = results.reduce(
      (acc: Record<string, number>, row: { status: string; count: string }) => ({
        ...acc,
        [row.status]: parseInt(row.count, 10),
      }),
      {} as Record<string, number>,
    );

    const total = (Object.values(counts) as number[]).reduce(
      (sum: number, c: number) => sum + c,
      0,
    );

    return {
      total,
      completed: counts[InboundEmailStatus.COMPLETED] ?? 0,
      failed: counts[InboundEmailStatus.FAILED] ?? 0,
      unclassified: counts[InboundEmailStatus.UNCLASSIFIED] ?? 0,
      pending:
        (counts[InboundEmailStatus.PENDING] ?? 0) + (counts[InboundEmailStatus.PROCESSING] ?? 0),
    };
  }
}
