import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberTaxInvoiceCorrection } from "../entities/rubber-tax-invoice-correction.entity";
import { RubberTaxInvoiceCorrectionRepository } from "./rubber-tax-invoice-correction.repository";

@Injectable()
export class PostgresRubberTaxInvoiceCorrectionRepository
  extends TypeOrmCrudRepository<RubberTaxInvoiceCorrection>
  implements RubberTaxInvoiceCorrectionRepository
{
  constructor(
    @InjectRepository(RubberTaxInvoiceCorrection)
    repository: Repository<RubberTaxInvoiceCorrection>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberTaxInvoiceCorrection>): RubberTaxInvoiceCorrection {
    return this.repository.create(data as TypeOrmDeepPartial<RubberTaxInvoiceCorrection>);
  }

  saveMany(entities: RubberTaxInvoiceCorrection[]): Promise<RubberTaxInvoiceCorrection[]> {
    return this.repository.save(entities);
  }

  findRecentBySupplierName(
    supplierName: string,
    limit: number,
  ): Promise<RubberTaxInvoiceCorrection[]> {
    return this.repository.find({
      where: { supplierName },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
