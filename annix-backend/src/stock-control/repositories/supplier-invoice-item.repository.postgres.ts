import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SupplierInvoiceItem } from "../entities/supplier-invoice-item.entity";
import { SupplierInvoiceItemRepository } from "./supplier-invoice-item.repository";

@Injectable()
export class PostgresSupplierInvoiceItemRepository
  extends TypeOrmCrudRepository<SupplierInvoiceItem>
  implements SupplierInvoiceItemRepository
{
  constructor(@InjectRepository(SupplierInvoiceItem) repository: Repository<SupplierInvoiceItem>) {
    super(repository);
  }

  buildMany(rows: DeepPartial<SupplierInvoiceItem>[]): SupplierInvoiceItem[] {
    return this.repository.create(rows as TypeOrmDeepPartial<SupplierInvoiceItem>[]);
  }

  saveMany(entities: SupplierInvoiceItem[]): Promise<SupplierInvoiceItem[]> {
    return this.repository.save(entities);
  }

  countByInvoice(invoiceId: number): Promise<number> {
    return this.repository.count({ where: { invoiceId } });
  }

  async deleteByInvoice(invoiceId: number): Promise<void> {
    await this.repository.delete({ invoiceId });
  }

  findByInvoice(invoiceId: number): Promise<SupplierInvoiceItem[]> {
    return this.repository.find({ where: { invoiceId } });
  }

  findByInvoiceWithRelations(
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem[]> {
    return this.repository.find({ where: { invoiceId }, relations });
  }

  findOneByIdAndInvoice(id: number, invoiceId: number): Promise<SupplierInvoiceItem | null> {
    return this.repository.findOne({ where: { id, invoiceId } });
  }

  findOneByIdAndInvoiceWithRelations(
    id: number,
    invoiceId: number,
    relations: string[],
  ): Promise<SupplierInvoiceItem | null> {
    return this.repository.findOne({ where: { id, invoiceId }, relations });
  }
}
