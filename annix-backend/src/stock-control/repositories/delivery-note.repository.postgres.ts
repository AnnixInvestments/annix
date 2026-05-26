import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DeliveryNote } from "../entities/delivery-note.entity";
import {
  type DeliveryNoteAutoLinkRow,
  DeliveryNoteRepository,
  type DeliveryNoteSearchRow,
} from "./delivery-note.repository";

@Injectable()
export class PostgresDeliveryNoteRepository
  extends TypeOrmCrudRepository<DeliveryNote>
  implements DeliveryNoteRepository
{
  constructor(@InjectRepository(DeliveryNote) repository: Repository<DeliveryNote>) {
    super(repository);
  }

  findOneByNumber(companyId: number, deliveryNumber: string): Promise<DeliveryNote | null> {
    return this.repository.findOne({
      where: { companyId, deliveryNumber },
    });
  }

  findOneForCompany(id: number, companyId: number): Promise<DeliveryNote | null> {
    return this.repository.findOne({
      where: { id, companyId },
    });
  }

  findOneForCompanyWithItems(id: number, companyId: number): Promise<DeliveryNote | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["items", "items.stockItem"],
    });
  }

  findPaginatedWithItems(companyId: number, page: number, limit: number): Promise<DeliveryNote[]> {
    return this.repository.find({
      where: { companyId },
      relations: ["items", "items.stockItem"],
      order: { createdAt: "DESC" },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  findAllForCompanyByReceivedDate(companyId: number): Promise<DeliveryNote[]> {
    return this.repository.find({
      where: { companyId },
      order: { receivedDate: "DESC" },
    });
  }

  async findAutoLinkCandidates(companyId: number): Promise<DeliveryNoteAutoLinkRow[]> {
    const rows = await this.repository.find({
      where: { companyId },
      select: {
        id: true,
        deliveryNumber: true,
        supplierName: true,
        receivedDate: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      deliveryNumber: row.deliveryNumber,
      supplierName: row.supplierName,
      receivedDate: row.receivedDate,
    }));
  }

  countPendingExtraction(companyId: number): Promise<number> {
    return this.repository.count({
      where: { companyId, extractionStatus: IsNull() },
    });
  }

  countCompletedExtraction(companyId: number): Promise<number> {
    return this.repository.count({
      where: { companyId, extractionStatus: "completed" },
    });
  }

  countCreatedSince(companyId: number, since: Date): Promise<number> {
    return this.repository.count({
      where: { companyId, createdAt: MoreThanOrEqual(since) },
    });
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<DeliveryNoteSearchRow[]> {
    const rows = await this.repository
      .createQueryBuilder("dn")
      .select(["dn.id", "dn.deliveryNumber", "dn.supplierName", "dn.notes", "dn.createdAt"])
      .where("dn.companyId = :companyId", { companyId })
      .andWhere(
        "(dn.deliveryNumber ILIKE :pattern OR dn.supplierName ILIKE :pattern OR dn.notes ILIKE :pattern)",
        { pattern },
      )
      .orderBy("dn.createdAt", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      deliveryNumber: row.deliveryNumber,
      supplierName: row.supplierName,
      notes: row.notes,
      createdAt: row.createdAt,
    }));
  }
}
