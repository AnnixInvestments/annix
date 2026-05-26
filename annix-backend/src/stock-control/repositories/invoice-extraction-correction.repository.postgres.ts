import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InvoiceExtractionCorrection } from "../entities/invoice-extraction-correction.entity";
import { InvoiceExtractionCorrectionRepository } from "./invoice-extraction-correction.repository";

@Injectable()
export class PostgresInvoiceExtractionCorrectionRepository
  extends TypeOrmCrudRepository<InvoiceExtractionCorrection>
  implements InvoiceExtractionCorrectionRepository
{
  constructor(
    @InjectRepository(InvoiceExtractionCorrection)
    repository: Repository<InvoiceExtractionCorrection>,
  ) {
    super(repository);
  }

  createMany(
    rows: Array<DeepPartial<InvoiceExtractionCorrection>>,
  ): Promise<InvoiceExtractionCorrection[]> {
    const entities = rows.map((row) => this.repository.create(row));
    return this.repository.save(entities);
  }

  findRecentForSupplier(
    companyId: number,
    supplierName: string,
    limit: number,
  ): Promise<InvoiceExtractionCorrection[]> {
    return this.repository.find({
      where: { companyId, supplierName },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
