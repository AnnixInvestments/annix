import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  ClarificationStatus,
  ClarificationType,
  InvoiceClarification,
} from "../entities/invoice-clarification.entity";
import { InvoiceClarificationRepository } from "./invoice-clarification.repository";

@Injectable()
export class PostgresInvoiceClarificationRepository
  extends TypeOrmCrudRepository<InvoiceClarification>
  implements InvoiceClarificationRepository
{
  constructor(
    @InjectRepository(InvoiceClarification)
    repository: Repository<InvoiceClarification>,
  ) {
    super(repository);
  }

  countByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus | string,
  ): Promise<number> {
    return this.repository.count({
      where: { invoiceId, status: status as ClarificationStatus },
    });
  }

  async deleteForInvoice(invoiceId: number): Promise<void> {
    await this.repository.delete({ invoiceId });
  }

  findOneByIdWithRelations(clarificationId: number): Promise<InvoiceClarification | null> {
    return this.repository.findOne({
      where: { id: clarificationId },
      relations: ["invoiceItem", "invoice"],
    });
  }

  findByInvoiceItemAndStatus(
    invoiceItemId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]> {
    return this.repository.find({
      where: { invoiceItemId, status },
    });
  }

  findByInvoiceAndStatus(
    invoiceId: number,
    status: ClarificationStatus,
  ): Promise<InvoiceClarification[]> {
    return this.repository.find({
      where: { invoiceId, status },
    });
  }

  findSkippedPriceForInvoice(invoiceId: number): Promise<InvoiceClarification[]> {
    return this.repository.find({
      where: {
        invoiceId,
        clarificationType: ClarificationType.PRICE_CONFIRMATION,
        status: ClarificationStatus.SKIPPED,
      },
    });
  }

  findPendingForInvoiceWithItem(invoiceId: number): Promise<InvoiceClarification[]> {
    return this.repository.find({
      where: { invoiceId, status: ClarificationStatus.PENDING },
      relations: ["invoiceItem"],
      order: { createdAt: "ASC" },
    });
  }

  saveMany(entities: InvoiceClarification[]): Promise<InvoiceClarification[]> {
    return this.repository.save(entities);
  }
}
